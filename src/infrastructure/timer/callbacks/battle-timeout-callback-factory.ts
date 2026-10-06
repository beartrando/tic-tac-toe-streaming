import TimerCallbackInterface from "../interfaces/timer-callback.interface";
import TimerCallbackFactoryInterface from "../interfaces/timer-callback-factory.interface";
import BattleService from "../../battle/service";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";

export class BattleTimeoutCallbackFactory implements TimerCallbackFactoryInterface<BattleId> {

    constructor(
        private readonly battleService: BattleService,
    ) {
    }

    create(battleId: BattleId): TimerCallbackInterface {
        return async () => {
            await this.battleService.timeout(battleId);
        };
    }
}

export default BattleTimeoutCallbackFactory;
