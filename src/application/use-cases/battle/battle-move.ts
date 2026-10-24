import * as streamingProto from "../../../contracts/proto/streaming";
import * as engineProto from "../../../contracts/proto/engine";
import GrpcStreamService from "../../../infrastructure/grpc-stream/service";
import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";

export class BattleMoveUseCase {
    constructor(
        private readonly grpcStreamService: GrpcStreamService<engineProto.BattleRequest>,
    ) {
    }

    async execute(
        profileId: ProfileId,
        payload: streamingProto.BattleMove,
    ): Promise<void> {
        const grpcRequest = engineProto.BattleRequest.create({
            move: engineProto.BattleMove.create({
                profileId: profileId.value,
                ...payload,
            }),
        });

        this.grpcStreamService.stream.write(grpcRequest);
    }
}

export default BattleMoveUseCase;
