import BattleId from "../../domain/battle/value-objects/battle-id.vo";

/**
 * Время последней активности (входящий или исходящий пакет) по каждому баттлу.
 * Используется BattleTimeoutPollService для опроса battle о «залипших» баттлах.
 */
export class BattleActivityTracker {
    private readonly lastActivityAt = new Map<string, number>();

    touch(battleId: BattleId | string): void {
        this.lastActivityAt.set(BattleActivityTracker.normalize(battleId), Date.now());
    }

    touchAll(battleIds: Iterable<BattleId>): void {
        for (const battleId of battleIds) {
            this.touch(battleId);
        }
    }

    forget(battleId: BattleId | string): void {
        this.lastActivityAt.delete(BattleActivityTracker.normalize(battleId));
    }

    /**
     * Id баттлов, по которым активности не было дольше `thresholdMs`.
     */
    stale(thresholdMs: number, now: number = Date.now()): string[] {
        const staleBattleIds: string[] = [];

        for (const [battleId, lastActivityAt] of this.lastActivityAt) {
            if (now - lastActivityAt >= thresholdMs) {
                staleBattleIds.push(battleId);
            }
        }

        return staleBattleIds;
    }

    private static normalize(battleId: BattleId | string): string {
        return typeof battleId === "string" ? battleId : battleId.value;
    }
}

export default BattleActivityTracker;
