import BattleTimeoutCallbackFactory from "./battle-timeout-callback-factory";
import {TimerCallbackFactoryHolder, TimerService} from "@shared/timer";
import BattleTimeoutCheckUseCase from "../../../application/use-cases/battle/battle-timeout-check";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";

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

describe("BattleTimeoutCallbackFactory (простой → опрос каждые 10 сек)", () => {
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
