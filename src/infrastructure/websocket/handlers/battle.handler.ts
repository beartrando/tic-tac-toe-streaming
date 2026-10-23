import {WebSocket,} from "ws";
import * as streamingProto from "../../../contracts/proto/streaming";
import WebsocketHandlerInterface from "../interfaces/websocket-handler.interface";

import BattleInitUseCase from "../../../application/use-cases/battle/battle-init";
import BattleMoveUseCase from "../../../application/use-cases/battle/battle-move";
import BattleLeaveUseCase from "../../../application/use-cases/battle/battle-leave";
import BattleConnectBotUseCase from "../../../application/use-cases/battle/battle-connect-bot";

import logger from "@shared/logger";
import {SpanKind, withSpan} from "@shared/otel";
import {TimerService} from "@shared/timer";
import SessionAccessToken from "../../../domain/session/value-objects/session-access-token.vo";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";
import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";
import BattleStartUseCase from "../../../application/use-cases/battle/battle-start";
import {MessageLogger} from "@shared/persistent-logger";
import {
    WS_INCOMING_BATTLE_CONNECT_BOT_MESSAGE,
    WS_INCOMING_BATTLE_INIT_MESSAGE,
    WS_INCOMING_BATTLE_LEAVE_MESSAGE,
    WS_INCOMING_BATTLE_MOVE_MESSAGE,
    WS_INCOMING_BATTLE_START_MESSAGE
} from "../../persistent-logger/stream-constants";

export class BattleHandler implements WebsocketHandlerInterface {
    constructor(
        private readonly timerService: TimerService<WebSocket, WebSocket>,
        private readonly initUseCase: BattleInitUseCase,
        private readonly startUseCase: BattleStartUseCase,
        private readonly moveUseCase: BattleMoveUseCase,
        private readonly connectBotUseCase: BattleConnectBotUseCase,
        private readonly leaveUseCase: BattleLeaveUseCase,
        private readonly messageLogger?: MessageLogger,
    ) {
    }

    async handle(ws: WebSocket, accessToken: SessionAccessToken, profileId: ProfileId, payload: streamingProto.BattleRequest): Promise<void> {
        // logger.log('battleHandler got event');
        // logger.log(payload);

        return withSpan(
            'ws.battle.request',
            async () => {
                try {
                    if (payload.init) {
                        this.messageLogger?.logIn(
                            WS_INCOMING_BATTLE_INIT_MESSAGE,
                            payload.init,
                        );
                        const battleId = payload.init.battleId ? new BattleId(payload.init.battleId) : undefined;
                        return this.initUseCase.execute(
                            ws,
                            accessToken,
                            profileId,
                            battleId,
                        );
                    } else if (payload.start) {
                        this.messageLogger?.logIn(
                            WS_INCOMING_BATTLE_START_MESSAGE,
                            payload.start,
                        );
                        this.timerService.restart(ws, ws);
                        return this.startUseCase.execute(profileId, payload.start);
                    } else if (payload.move) {
                        this.messageLogger?.logIn(
                            WS_INCOMING_BATTLE_MOVE_MESSAGE,
                            payload.move,
                        );
                        this.timerService.restart(ws, ws);
                        return this.moveUseCase.execute(profileId, payload.move);
                    } else if (payload.ping) {
                        return;
                    } else if (payload.connectBot) {
                        this.messageLogger?.logIn(
                            WS_INCOMING_BATTLE_CONNECT_BOT_MESSAGE,
                            payload.connectBot,
                        );
                        return this.connectBotUseCase.execute(profileId, new BattleId(payload.connectBot.battleId));
                    } else if (payload.leave) {
                        this.messageLogger?.logIn(
                            WS_INCOMING_BATTLE_LEAVE_MESSAGE,
                            payload.leave,
                        );
                        const battleId = new BattleId(payload.leave.battleId);
                        return this.leaveUseCase.execute(profileId, battleId);
                    }

                    logger.warn(`⚠️ Unknown payload type:`, payload);
                } catch (e) {
                    logger.error(`⚠️ error:`, e);
                }
            },
            {
                kind: SpanKind.SERVER,
                attributes: {'messaging.system': 'websocket'},
            },
        );
    }

}

export default BattleHandler;
