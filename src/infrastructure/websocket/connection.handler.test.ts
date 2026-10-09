import ConnectionHandler from "./connection.handler";
import SocketEncoding from "./enums/socket-encoding";
import BattleId from "../../domain/battle/value-objects/battle-id.vo";
import ProfileId from "../../domain/profile/value-objects/profile-id.vo";
import type AuthService from "../auth/service";
import type AuthorizeProfileUseCase from "../../application/use-cases/auth/authorize-profile";
import type WebsocketDisconnectUseCase from "../../application/use-cases/websocket/websocket-disconnect";
import type BattleWebsocketsRegistry from "./registers/battle-websockets.registry";
import {TimerService} from "@shared/timer";
import type HeartbeatWebSocket from "./types/heartbeat-websocket";
import type WebsocketHandlerInterface from "./interfaces/websocket-handler.interface";

type Listener = (data: unknown) => void;

function build() {
    const battleIds = new Set([new BattleId("battle-1"), new BattleId("battle-2")]);
    const profileId = new ProfileId("profile-1");

    const authService = {
        verifyAccessToken: jest.fn().mockReturnValue({value: "user-1"}),
    } as unknown as AuthService;

    const authorizeProfileUseCase = {
        execute: jest.fn().mockReturnValue(true),
    } as unknown as AuthorizeProfileUseCase;

    const websocketDisconnectUseCase = {
        execute: jest.fn(),
    } as unknown as WebsocketDisconnectUseCase;

    const registry = {
        registerSocket: jest.fn(),
        getSocketContext: jest.fn().mockReturnValue({profileId, battleIds, encoding: SocketEncoding.PLAIN}),
    } as unknown as BattleWebsocketsRegistry;

    const timerService = {
        start: jest.fn(),
        restart: jest.fn(),
        stop: jest.fn(),
    } as unknown as TimerService<string, BattleId>;

    const handler = new ConnectionHandler(
        authService,
        authorizeProfileUseCase,
        websocketDisconnectUseCase,
        registry,
        timerService,
    );

    const routeHandler = {handle: jest.fn()} as unknown as WebsocketHandlerInterface;

    handler.registerHandler("/battle", routeHandler);

    const listeners: Record<string, Listener> = {};

    const ws = {
        on: jest.fn((event: string, listener: Listener) => {
            listeners[event] = listener;
        }),
        close: jest.fn(),
        readyState: 1,
    } as unknown as HeartbeatWebSocket;

    const req = {
        url: "/battle?profileId=profile-1",
        headers: {
            host: "localhost",
            authorization: "Bearer token",
            "x-debug-json": "",
        },
    } as unknown as Parameters<ConnectionHandler["handle"]>[1];

    return {handler, ws, req, timerService, routeHandler, listeners, battleIds};
}

describe("ConnectionHandler — входящий пакет обновляет простой баттлов", () => {
    test("рестартует таймер каждого баттла сокета", async () => {
        const {handler, ws, req, timerService, routeHandler, listeners, battleIds} = build();

        await handler.handle(ws, req);

        listeners["message"]!(JSON.stringify({ping: {}}));

        expect(routeHandler.handle).toHaveBeenCalledTimes(1);
        expect(timerService.restart).toHaveBeenCalledTimes(battleIds.size);

        const restartedKeys = (timerService.restart as jest.Mock).mock.calls.map(([key]) => key);

        expect(restartedKeys.sort()).toEqual(["battle-1", "battle-2"]);

        for (const [, entity] of (timerService.restart as jest.Mock).mock.calls) {
            expect(entity).toBeInstanceOf(BattleId);
        }
    });
});
