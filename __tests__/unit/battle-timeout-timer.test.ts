import BattleTimeoutCallbackFactory from "../../src/infrastructure/timer/callbacks/battle-timeout-callback-factory";
import TimerCallbackFactoryHolder from "../../src/infrastructure/timer/callback-factory-holder";
import TimerService from "../../src/infrastructure/timer/service";
import BattleTimeoutCheckUseCase from "../../src/application/use-cases/battle/battle-timeout-check";
import BattleWebsocketSender from "../../src/infrastructure/websocket/senders/battle-websocket.sender";
import BattleId from "../../src/domain/battle/value-objects/battle-id.vo";
import type BattleWebsocketsRegistry from "../../src/infrastructure/websocket/registers/battle-websockets.registry";
import * as battleProto from "../../src/contracts/proto/battle";

const IDLE_TIMEOUT_SECONDS = 180;
const POLL_INTERVAL_SECONDS = 10;

const battleId = new BattleId("battle-1");

/** Промисы внутри колбэка таймера не ждут макрозадач — сливаем микрозадачи. */
async function flush(): Promise<void> {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

function buildTimer(check: jest.Mock) {
    const holder = new TimerCallbackFactoryHolder<BattleId>();

    const timerService = new TimerService<string, BattleId>(
        holder,
        IDLE_TIMEOUT_SECONDS,
    );

    const factory = new BattleTimeoutCallbackFactory(
        {execute: check} as unknown as BattleTimeoutCheckUseCase,
        timerService,
        POLL_INTERVAL_SECONDS,
    );

    holder.factory = factory;

    return {timerService, factory};
}

describe("battle timeout timer (простой → опрос каждые 10 сек)", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("до истечения простоя баттл не опрашивается", async () => {
        const check = jest.fn().mockResolvedValue(false);
        const {timerService} = buildTimer(check);

        timerService.start(battleId.value, battleId);

        jest.advanceTimersByTime((IDLE_TIMEOUT_SECONDS - 1) * 1000);
        await flush();

        expect(check).not.toHaveBeenCalled();
    });

    test("3 минуты простоя — первый опрос, дальше каждые 10 секунд", async () => {
        const check = jest.fn().mockResolvedValue(false);
        const {timerService} = buildTimer(check);

        timerService.start(battleId.value, battleId);

        jest.advanceTimersByTime(IDLE_TIMEOUT_SECONDS * 1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(1);
        expect(check).toHaveBeenCalledWith(battleId);

        jest.advanceTimersByTime(POLL_INTERVAL_SECONDS * 1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(2);

        jest.advanceTimersByTime(POLL_INTERVAL_SECONDS * 1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(3);
    });

    test("активность сбрасывает простой", async () => {
        const check = jest.fn().mockResolvedValue(false);
        const {timerService} = buildTimer(check);

        timerService.start(battleId.value, battleId);

        jest.advanceTimersByTime(100 * 1000);
        timerService.restart(battleId.value, battleId);

        // с момента рестарта прошло меньше 3 минут — опроса нет
        jest.advanceTimersByTime((IDLE_TIMEOUT_SECONDS - 1) * 1000);
        await flush();
        expect(check).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(1);
    });

    test("баттл терминальный — опрос прекращается", async () => {
        const check = jest.fn().mockResolvedValueOnce(true);
        const {timerService} = buildTimer(check);

        timerService.start(battleId.value, battleId);

        jest.advanceTimersByTime(IDLE_TIMEOUT_SECONDS * 1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(POLL_INTERVAL_SECONDS * 1000 * 5);
        await flush();
        expect(check).toHaveBeenCalledTimes(1);
    });

    test("ошибка проверки не роняет цикл — опрос продолжается", async () => {
        const check = jest.fn()
            .mockRejectedValueOnce(new Error("boom"))
            .mockResolvedValue(false);
        const {timerService} = buildTimer(check);

        timerService.start(battleId.value, battleId);

        jest.advanceTimersByTime(IDLE_TIMEOUT_SECONDS * 1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(POLL_INTERVAL_SECONDS * 1000);
        await flush();
        expect(check).toHaveBeenCalledTimes(2);
    });

    test("stop отменяет ожидаемый опрос", async () => {
        const check = jest.fn().mockResolvedValue(false);
        const {timerService} = buildTimer(check);

        timerService.start(battleId.value, battleId);
        timerService.stop(battleId.value);

        jest.advanceTimersByTime(IDLE_TIMEOUT_SECONDS * 1000 * 10);
        await flush();

        expect(check).not.toHaveBeenCalled();
    });
});

describe("активность баттла перезапускает таймер", () => {
    test("исходящий пакет (sender.send) рестартует таймер баттла", () => {
        const registry = {
            getBattleSockets: jest.fn().mockReturnValue(null),
        } as unknown as BattleWebsocketsRegistry;

        const timerService = {restart: jest.fn()} as unknown as TimerService<string, BattleId>;

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
