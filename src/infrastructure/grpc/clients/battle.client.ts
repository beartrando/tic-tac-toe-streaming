import * as grpc from "@grpc/grpc-js";

import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";

export class BattleClient {
    private readonly manager: GrpcClientManager<battleProto.BattleClient>;

    constructor(
        private readonly url: string,
    ) {
        this.manager = new GrpcClientManager(
            () => new battleProto.BattleClient(this.url, grpc.credentials.createInsecure()),
        );
    }

    async init(request: battleProto.BattleInitRequest, metadata: grpc.Metadata): Promise<battleProto.BattleResponse | null> {
        // logger.log(request);

        return this.manager.call<battleProto.BattleResponse>(
            (client, cb) => client.init(request, metadata, cb)
        ).catch((err) => {
            logger.error("Start engine failed:", err);
            return null;
        });
    }

    async getMany(
        request: battleProto.BattleIdsRequest,
        metadata: grpc.Metadata,
    ): Promise<battleProto.BattlesResponse | null> {
        return this.manager.call<battleProto.BattlesResponse>(
            (client, cb) => client.getMany(request, metadata, cb)
        ).catch((err) => {
            logger.error("Get many battles failed:", err);
            return null;
        });
    }
}

export default BattleClient;
