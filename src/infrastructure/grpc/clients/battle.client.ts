import * as grpc from "@grpc/grpc-js";

import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";
import {type MessageLogger} from "@shared/persistent-logger";
import {BATTLE_GET_MANY_PATH} from "../../persistent-logger/stream-constants";

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
        void this.messageLogger?.logOut(
            BATTLE_GET_MANY_PATH,
            request,
        );

        return this.manager.call<battleProto.BattlesResponse>(
            (client, cb) => client.getMany(request, metadata, cb)
        ).then((response) => {
            void this.messageLogger?.logIn(BATTLE_GET_MANY_PATH, response);

            return response;
        }).catch((err) => {
            logger.error("Get many battles failed:", err);

            return null;
        });
    }
}

export default BattleClient;
