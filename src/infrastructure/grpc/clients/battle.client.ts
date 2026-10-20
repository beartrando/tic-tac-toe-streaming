import * as grpc from "@grpc/grpc-js";

import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";
import {extractTrackId, type MessageLogger} from "@shared/elastic";
import {BATTLE_GET_MANY_PATH} from "../grpc.constants";

export class BattleClient {
    private readonly manager: GrpcClientManager<battleProto.BattleClient>;

    constructor(
        private readonly url: string,
        private readonly messageLogger?: MessageLogger,
    ) {
        this.manager = new GrpcClientManager(
            () => new battleProto.BattleClient(this.url, grpc.credentials.createInsecure()),
        );
    }

    async getMany(
        request: battleProto.BattleIdsRequest,
        metadata: grpc.Metadata,
    ): Promise<battleProto.BattlesResponse | null> {
        const spanId = this.messageLogger?.logOut(
            'grpc',
            BATTLE_GET_MANY_PATH,
            request,
            {trackId: extractTrackId(request)},
        );

        return this.manager.call<battleProto.BattlesResponse>(
            (client, cb) => client.getMany(request, metadata, cb)
        ).then((response) => {
            this.messageLogger?.logIn('grpc', BATTLE_GET_MANY_PATH, response, {spanId});

            return response;
        }).catch((err) => {
            logger.error("Get many battles failed:", err);

            this.messageLogger?.logIn(
                'grpc',
                BATTLE_GET_MANY_PATH,
                {error: (err as Error)?.message ?? String(err)},
                {spanId},
            );

            return null;
        });
    }
}

export default BattleClient;
