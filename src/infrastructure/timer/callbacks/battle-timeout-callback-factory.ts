import logger from "@shared/logger";
import TimerCallbackInterface from "../interfaces/timer-callback.interface";
import TimerCallbackFactoryInterface from "../interfaces/timer-callback-factory.interface";
import TimerService from "../service";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";
import BattleTimeoutCheckUseCase from "../../../application/use-cases/battle/battle-timeout-check";

/**
 * Таймер простоя конкретного баттла (ключ — battleId).
 *
 * Активность (входящий/исходящий пакет по баттлу) перезапускает таймер с
 * `idleTimeoutSeconds`. По срабатыванию баттл опрашивается через
 * `BattleTimeoutCheckUseCase`: пока он жив — таймер перевооружается на
 * `pollIntervalSeconds` (по ТЗ после 3 минут простоя опрос каждые 10 секунд),
 * если баттл стал терминальным или сокетов больше нет — опрос прекращается.
 */
export class BattleTimeoutCallbackFactory implements TimerCallbackFactoryInterface<BattleId> {

    constructor(
        private readonly checkUseCase: BattleTimeoutCheckUseCase,
        private readonly timerService: TimerService<string, BattleId>,
        private readonly pollIntervalSeconds: number,
    ) {
    }

    create(battleId: BattleId): TimerCallbackInterface {
        return async () => {
            // Перевооружаемся сразу: активность, пришедшая пока идёт запрос
            // в battle, не должна быть затёрта таймером из этого колбэка.
            this.timerService.start(battleId.value, battleId, this.pollIntervalSeconds);

            let finished = false;

            try {
                finished = await this.checkUseCase.execute(battleId);
            } catch (err) {
                logger.error({err}, "💥 Battle timeout check failed");
            }

            if (finished) {
                this.timerService.stop(battleId.value);
            }
        };
    }
}

export default BattleTimeoutCallbackFactory;
