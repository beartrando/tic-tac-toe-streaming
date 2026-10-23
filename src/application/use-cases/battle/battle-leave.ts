import * as engineProto from "../../../contracts/proto/engine";
import BattleWebsocketsRegistry from "../../../infrastructure/websocket/registers/battle-websockets.registry";
import GrpcStreamService from "../../../infrastructure/grpc-stream/service";
import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";

export class BattleLeaveUseCase {
    constructor(
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly grpcStreamService: GrpcStreamService<engineProto.BattleRequest>,
    ) {
    }

    async execute(
        profileId: ProfileId,
        battleId: BattleId,
    ): Promise<void> {
        const grpcRequest = engineProto.BattleRequest.create({
            leave: engineProto.BattleLeave.create({
                battleId: battleId.value,
                profileId: profileId.value,
            }),
        });
        this.grpcStreamService.stream.write(grpcRequest);
    }
}

export default BattleLeaveUseCase;
