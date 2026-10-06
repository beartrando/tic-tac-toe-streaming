import BattleStatus from "./value-objects/battle-status.vo";
import BattleStatusEnum from "./enums/battle-status.enum";
import BattleId from "../battle/value-objects/battle-id.vo";

export type BattleEntityProps = {
    id: BattleId;
    // playerIds: BattlePlayerIds;
    // board?: BattleBoard;
    status?: BattleStatus;
    // winnerId?: ProfileId | null;
    // lastMoveAt?: Date | null;
};

export class BattleEntity {
    constructor(
        readonly id: BattleId,
        // readonly playerIds: BattlePlayerIds,
        // public board: BattleBoard,
        public status: BattleStatus,
        // public winnerId: ProfileId | null,
        // public lastMoveAt: Date | null,
    ) {
    }

    static create(props: BattleEntityProps): BattleEntity {
        return new BattleEntity(
            props.id,
            // props.playerIds,
            // props.board ?? BattleBoard.empty(),
            props.status ?? new BattleStatus(BattleStatusEnum.Created),
            // props.winnerId ?? null,
            // props.lastMoveAt ?? null,
        );
    }

    isTerminated(): boolean {
        return this.status.equals(new BattleStatus(BattleStatusEnum.Finished))
            || this.status.equals(new BattleStatus(BattleStatusEnum.Cancelled))
            || this.status.equals(new BattleStatus(BattleStatusEnum.TimeOut));
    }
}

export default BattleEntity;
