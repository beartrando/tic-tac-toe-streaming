import BattleTimeoutCheckUseCase from "../../src/application/use-cases/battle/battle-timeout-check";
import BattleId from "../../src/domain/battle/value-objects/battle-id.vo";
import type BattleClient from "../../src/infrastructure/grpc/clients/battle.client";
import type BattleWebsocketsRegistry from "../../src/infrastructure/websocket/registers/battle-websockets.registry";
import type BattleWebsocketSender from "../../src/infrastructure/websocket/senders/battle-websocket.sender";
import * as battleProto from "../../src/contracts/proto/battle";

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
    const getMany = jest.fn().mockResolvedValue(
        options?.response ?? battlesResponse([]),
    );

    const battleClient = {getMany} as unknown as BattleClient;

    const hasBattleSockets = jest.fn().mockReturnValue(options?.hasSockets ?? true);
    const unsubscribeBattle = jest.fn();

    const registry = {
        hasBattleSockets,
        unsubscribeBattle,
    } as unknown as BattleWebsocketsRegistry;

    const send = jest.fn();
    const sender = {send} as unknown as BattleWebsocketSender;

    const useCase = new BattleTimeoutCheckUseCase(battleClient, registry, sender);

    return {useCase, getMany, hasBattleSockets, unsubscribeBattle, send};
}

describe("BattleTimeoutCheckUseCase", () => {
    const battleId = new BattleId("battle-1");

    test("баттл без сокетов — наблюдать нечего, battle не опрашивается", async () => {
        const {useCase, getMany, hasBattleSockets} = build({hasSockets: false});

        await expect(useCase.execute(battleId)).resolves.toBe(true);

        expect(hasBattleSockets).toHaveBeenCalledWith(battleId);
        expect(getMany).not.toHaveBeenCalled();
    });

    test("живой баттл — возвращаем false, клиентам ничего не шлём", async () => {
        const {useCase, getMany, send, unsubscribeBattle} = build({
            response: battlesResponse([
                battleProto.BattleObject.create({
                    id: "battle-1",
                    status: battleProto.BattleStatus.STARTED,
                }),
            ]),
        });

        await expect(useCase.execute(battleId)).resolves.toBe(false);

        expect(getMany).toHaveBeenCalledTimes(1);
        expect(getMany.mock.calls[0][0].battleIds).toEqual(["battle-1"]);
        expect(send).not.toHaveBeenCalled();
        expect(unsubscribeBattle).not.toHaveBeenCalled();
    });

    test("TimeOut — push клиентам, отписка, опрос прекращаем", async () => {
        const timedOutBattle = battleProto.BattleObject.create({
            id: "battle-1",
            status: battleProto.BattleStatus.TIMEOUT,
        });

        const {useCase, send, unsubscribeBattle} = build({
            response: battlesResponse([timedOutBattle]),
        });

        await expect(useCase.execute(battleId)).resolves.toBe(true);

        expect(send).toHaveBeenCalledWith(timedOutBattle);
        expect(unsubscribeBattle).toHaveBeenCalledTimes(1);
        expect(unsubscribeBattle.mock.calls[0][0].value).toBe("battle-1");
    });

    test.each([
        battleProto.BattleStatus.FINISHED,
        battleProto.BattleStatus.CANCELLED,
    ])("терминальный статус %s — push и отписка", async (status) => {
        const {useCase, send, unsubscribeBattle} = build({
            response: battlesResponse([
                battleProto.BattleObject.create({id: "battle-1", status}),
            ]),
        });

        await expect(useCase.execute(battleId)).resolves.toBe(true);

        expect(send).toHaveBeenCalledTimes(1);
        expect(unsubscribeBattle).toHaveBeenCalledTimes(1);
    });

    test("battle не ответил — остаёмся в опросе", async () => {
        const {useCase} = build({response: null});

        await expect(useCase.execute(battleId)).resolves.toBe(false);
    });

    test("пустой ответ — остаёмся в опросе", async () => {
        const {useCase, send, unsubscribeBattle} = build({
            response: battlesResponse([]),
        });

        await expect(useCase.execute(battleId)).resolves.toBe(false);

        expect(send).not.toHaveBeenCalled();
        expect(unsubscribeBattle).not.toHaveBeenCalled();
    });
});
