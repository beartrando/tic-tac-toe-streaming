import BattleWebsocketSender from "./battle-websocket.sender";
import type BattleWebsocketsRegistry from "../registers/battle-websockets.registry";
import type TimerService from "../../timer/service";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";
import * as battleProto from "../../../contracts/proto/battle";

describe("BattleWebsocketSender — активность баттла", () => {
    test("исходящий пакет рестартует таймер простоя баттла", () => {
        const registry = {
            getBattleSockets: jest.fn().mockReturnValue(null),
        } as unknown as BattleWebsocketsRegistry;

        const timerService = {
            restart: jest.fn(),
        } as unknown as TimerService<string, BattleId>;

        const sender = new BattleWebsocketSender(registry, timerService);

        sender.send(battleProto.BattleObject.create({
            id: "battle-1",
            status: battleProto.BattleStatus.STARTED,
        }));

        expect(timerService.restart).toHaveBeenCalledTimes(1);

        const [key, entity] = (timerService.restart as jest.Mock).mock.calls[0];

        expect(key).toBe("battle-1");
        expect((entity as BattleId).value).toBe("battle-1");
    });
});
