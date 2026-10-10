import * as grpc from "@grpc/grpc-js";

import * as matchmakingProto from "../../../contracts/proto/matchmaking";
import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";

export class MatchmakingClient {
    private readonly manager: GrpcClientManager<matchmakingProto.MatchmakingClient>;

    constructor(
        private readonly url: string,
    ) {
        this.manager = new GrpcClientManager(
            () => new matchmakingProto.MatchmakingClient(this.url, grpc.credentials.createInsecure()),
        );
    }

    async init(
        request: matchmakingProto.BattleInitRequest,
        metadata: grpc.Metadata,
    ): Promise<battleProto.BattleResponse | null> {
        return this.manager.call<battleProto.BattleResponse>(
            (client, cb) => client.init(request, metadata, cb)
        ).catch((err) => {
            logger.error("Matchmaking init failed:", err);
            return null;
        });
    }
}

export default MatchmakingClient;
