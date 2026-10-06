import BattleTimeoutPollService from "../../src/infrastructure/battle-timeout/service";
import BattleActivityTracker from "../../src/infrastructure/battle-timeout/battle-activity.tracker";
import type BattleClient from "../../src/infrastructure/grpc/clients/battle.client";
import type BattleWebsocketsRegistry from "../../src/infrastructure/websocket/registers/battle-websockets.registry";
import type BattleWebsocketSender from "../../src/infrastructure/websocket/senders/battle-websocket.sender";
import * as battleProto from "../../src/contracts/proto/battle";

const baseTime = new Date("2026-10-06T12:00:00Z").getTime();

const IDLE_TIMEOUT_SECONDS = 180;
const POLL_INTERVAL_SECONDS = 10;

function battlesResponse(
    items: battleProto.BattleObject[],
): battleProto.BattlesResponse {
    return battleProto.BattlesResponse.create({
        battles: battleProto.BattleList.create({items}),
    });
}

function build(options?: {
    hasSockets?: boolean;
    response?: battleProto.BattlesResponse | null;
}) {
    const tracker = new BattleActivityTracker();

    const getMany = jest.fn().mockResolvedValue(
        options?.response ?? battlesResponse([]),
    );

    const battleClient = {
        getMany,
    } as unknown as BattleClient;

    const hasBattleSockets = jest.fn().mockReturnValue(options?.hasSockets ?? true);
    const unsubscribeBattle = jest.fn();

    const registry = {
        hasBattleSockets,
        unsubscribeBattle,
    } as unknown as BattleWebsocketsRegistry;

    const send = jest.fn();

    const sender = {
        send,
    } as unknown as BattleWebsocketSender;

    const service = new BattleTimeoutPollService(
        tracker,
        battleClient,
        registry,
        sender,
        IDLE_TIMEOUT_SECONDS,
        POLL_INTERVAL_SECONDS,
    );

    return {service, tracker, battleClient, getMany, hasBattleSockets, unsubscribeBattle, send, registry, sender};
}

describe("BattleTimeoutPollService", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(baseTime);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("нет простоя — battle не опрашивается", async () => {
        const {service, tracker, getMany} = build();

        tracker.touch("battle-1");

        await service.poll();

        expect(getMany).not.toHaveBeenCalled();
    });

    test("простой дольше порога — опрос battle.getMany", async () => {
        const {service, tracker, getMany} = build();

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        await service.poll();

        expect(getMany).toHaveBeenCalledTimes(1);

        const request = getMany.mock.calls[0][0];
        expect(request.battleIds).toEqual(["battle-1"]);
    });

    test("баттл без сокетов выпадает из опроса", async () => {
        const {service, tracker, getMany} = build({hasSockets: false});

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        await service.poll();

        expect(getMany).not.toHaveBeenCalled();
        expect(tracker.stale(IDLE_TIMEOUT_SECONDS * 1000)).toEqual([]);
    });

    test("живой баттл — остаёмся в опросе, клиентам ничего не шлём", async () => {
        const {service, tracker, getMany, send, unsubscribeBattle} = build({
            response: battlesResponse([
                battleProto.BattleObject.create({
                    id: "battle-1",
                    status: battleProto.BattleStatus.STARTED,
                }),
            ]),
        });

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        await service.poll();

        expect(send).not.toHaveBeenCalled();
        expect(unsubscribeBattle).not.toHaveBeenCalled();

        // баттл не забыт — следующий цикл опроса снова идёт в battle
        expect(tracker.stale(IDLE_TIMEOUT_SECONDS * 1000)).toEqual(["battle-1"]);

        await service.poll();
        expect(getMany).toHaveBeenCalledTimes(2);
    });

    test("TimeOut — push клиентам, отписка, выход из опроса", async () => {
        const timedOutBattle = battleProto.BattleObject.create({
            id: "battle-1",
            status: battleProto.BattleStatus.TIMEOUT,
        });

        const {service, tracker, getMany, send, unsubscribeBattle} = build({
            response: battlesResponse([timedOutBattle]),
        });

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        await service.poll();

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith(timedOutBattle);
        expect(unsubscribeBattle).toHaveBeenCalledTimes(1);
        expect(unsubscribeBattle.mock.calls[0][0].value).toBe("battle-1");
        expect(tracker.stale(IDLE_TIMEOUT_SECONDS * 1000)).toEqual([]);

        jest.setSystemTime(baseTime + 191_000);
        await service.poll();

        // после терминального статуса опрос не повторяется
        expect(getMany).toHaveBeenCalledTimes(1);
    });

    test("Finished/Cancelled тоже считаются терминальными", async () => {
        for (const status of [
            battleProto.BattleStatus.FINISHED,
            battleProto.BattleStatus.CANCELLED,
        ]) {
            const {service, tracker, send, unsubscribeBattle} = build({
                response: battlesResponse([
                    battleProto.BattleObject.create({id: "battle-1", status}),
                ]),
            });

            jest.setSystemTime(baseTime);
            tracker.touch("battle-1");
            jest.setSystemTime(baseTime + 181_000);

            await service.poll();

            expect(send).toHaveBeenCalledTimes(1);
            expect(unsubscribeBattle).toHaveBeenCalledTimes(1);
        }
    });

    test("ошибка опроса не роняет сервис и не теряет баттл", async () => {
        const {service, tracker, getMany} = build();

        getMany.mockRejectedValueOnce(new Error("boom"));

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        await expect(service.poll()).resolves.toBeUndefined();

        expect(tracker.stale(IDLE_TIMEOUT_SECONDS * 1000)).toEqual(["battle-1"]);

        await service.poll();
        expect(getMany).toHaveBeenCalledTimes(2);
    });
});
