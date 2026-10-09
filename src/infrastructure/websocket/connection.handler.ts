import {IncomingMessage} from "http";
import {RawData,} from "ws";

import * as streamingProto from "../../contracts/proto/streaming";
import logger from "@shared/logger";

import WebsocketHandlerInterface from "./interfaces/websocket-handler.interface";

import WebsocketConnectionHandlerInterface from "./interfaces/websocket-connection-handler.interface";
import SocketEncoding from "./enums/socket-encoding";
import AuthService from "../auth/service";
import SessionAccessToken from "../../domain/session/value-objects/session-access-token.vo";
import BattleWebsocketsRegistry from "./registers/battle-websockets.registry";
import AuthorizeProfileUseCase from "../../application/use-cases/auth/authorize-profile";
import WebsocketDisconnectUseCase from "../../application/use-cases/websocket/websocket-disconnect";
import HeartbeatWebSocket from "./types/heartbeat-websocket";
import UserId from "../../domain/user/value-objects/user-id.vo";
import ProfileId from "../../domain/profile/value-objects/profile-id.vo";
import BattleId from "../../domain/battle/value-objects/battle-id.vo";
import {TimerService} from "@shared/timer";

export class ConnectionHandler implements WebsocketConnectionHandlerInterface {
    private readonly handlers = new Map<
        string,
        WebsocketHandlerInterface
    >();

    constructor(
        private readonly authService: AuthService,
        private readonly authorizeProfileUseCase: AuthorizeProfileUseCase,
        private readonly websocketDisconnectUseCase: WebsocketDisconnectUseCase,
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly battleTimerService: TimerService<string, BattleId>,
    ) {
    }

    registerHandler(
        route: string,
        handler: WebsocketHandlerInterface,
    ): void {
        this.handlers.set(route, handler);
    }

    buildUrl(req: IncomingMessage): URL {
        return new URL(req.url ?? "/", `http://${req.headers.host}`);
    }

    getAccessToken(req: IncomingMessage): SessionAccessToken | null {
        const url = this.buildUrl(req);

        const value = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("token");

        return value ? new SessionAccessToken(value) : null;
    }

    async handle(ws: HeartbeatWebSocket, req: IncomingMessage): Promise<void> {
        // logger.info("New websocket connection established",);

        const token = this.getAccessToken(req);

        if (!token?.value) {
            ws.close();
            logger.error("❌ Token is missing");
            return;
        }

        let userId: UserId;

        try {
            userId = this.authService.verifyAccessToken(token);
        } catch {
            ws.close();
            logger.error("❌ JWT token is invalid");
            return;
        }

        const url = this.buildUrl(req);

        const profileId = new ProfileId(url.searchParams.get("profileId") ?? "");

        try {
            if (!this.authorizeProfileUseCase.execute(userId, profileId, token)) {
                ws.close();

                logger.error("❌ JWT token does not match to profile");

                return;
            }
        } catch {
            ws.close();
            logger.error("❌ Failed to authorize profile");

            return;
        }

        const encoding =
            req.headers["x-debug-json"] !== undefined
                ? SocketEncoding.PLAIN
                : SocketEncoding.PROTOBUF;

        this.battleWebsocketsRegistry.registerSocket(ws, profileId, encoding);

        const handler = this.handlers.get(url.pathname);

        if (!handler) {
            logger.warn(`Unknown websocket route: ${url.pathname}`);

            ws.close();
            return;
        }

        ws.on("message", data => {
            try {
                const request = this.decodeMessage(data, encoding);

                const context = this.battleWebsocketsRegistry.getSocketContext(ws);

                if (context) {
                    // входящий пакет по баттлу — активность, простой начинается заново
                    for (const battleId of context.battleIds) {
                        this.battleTimerService.restart(battleId.value, battleId);
                    }
                }

                void handler.handle(
                    ws,
                    token,
                    profileId,
                    request,
                    encoding,
                );
            } catch (err) {
                logger.error({err}, "WebSocket message handling failed",);
            }
        });

        ws.on("close", () => {
            // logger.info("Websocket connection closed",);
            this.websocketDisconnectUseCase.execute(ws);
        });

        ws.on("error", err => {
            logger.error(err);
            this.websocketDisconnectUseCase.execute(ws);
        });

        ws.isAlive = true;

        ws.on("pong", () => {
            // logger.log("pong");

            ws.isAlive = true;
        });
    }

    private decodeMessage(
        data: RawData,
        encoding: SocketEncoding,
    ): streamingProto.BattleRequest {

        // logger.log(data);
        // logger.log(encoding);

        const message = encoding === SocketEncoding.PLAIN
            ? JSON.parse(data.toString())
            : streamingProto.BattleRequest.decode(
                data as Uint8Array,
            );

        // logger.log(message);

        return message;
    }
}

export default ConnectionHandler;
