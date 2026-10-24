import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";
import * as streamingProto from "../../../contracts/proto/streaming";
import * as engineProto from "../../../contracts/proto/engine";
import GrpcStreamService from "../../../infrastructure/grpc-stream/service";

export class BattleStartUseCase {
    constructor(
        private readonly grpcStreamService: GrpcStreamService<engineProto.BattleRequest>,
    ) {
    }

    async execute(
        profileId: ProfileId,
        payload: streamingProto.BattleStart,
    ): Promise<void> {
        const grpcRequest = engineProto.BattleRequest.create({
            start: engineProto.BattleStart.create({
                profileId: profileId.value,
                ...payload,
            }),
        });

        this.grpcStreamService.stream.write(grpcRequest);
    }
}

export default BattleStartUseCase;
