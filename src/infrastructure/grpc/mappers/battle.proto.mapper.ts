import * as battleProto from "../../../contracts/proto/battle";
import BattleEntity, {BattleEntityProps} from "../../../domain/battle/battle.entity";
import BattleStatusProtoMapper from "./battle/battle-status.proto.mapper";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";

export class BattleProtoMapper {

    static toDomain(battle: battleProto.BattleObject): BattleEntity {
        const battleEntityProps: BattleEntityProps = {
            id: new BattleId(battle.id),
            // playerIds: new BattlePlayerIds(battle.playerIds.map((id: string) => new ProfileId(id))),
            // board: BattleBoardProtoMapper.toDomain(battle.board),
            status: BattleStatusProtoMapper.toDomain(battle.status),
            // winnerId: battle.winnerId ? new ProfileId(battle.winnerId) : null,
            // lastMoveAt: battle.lastMoveAt,
        };
        return BattleEntity.create(battleEntityProps);
    }
}

export default BattleProtoMapper;
