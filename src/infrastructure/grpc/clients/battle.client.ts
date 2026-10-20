import * as grpc from "@grpc/grpc-js";

import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";
import {extractTrackId, type MessageLogger} from "@shared/persistent-logger";
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
<<<<<<< HEAD
        const spanId = this.messageLogger?.logOut(
            'grpc',
=======
        void this.messageLogger?.logOut(
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
            BATTLE_GET_MANY_PATH,
            request,
            {trackId: extractTrackId(request)},
        );

        return this.manager.call<battleProto.BattlesResponse>(
            (client, cb) => client.getMany(request, metadata, cb)
        ).then((response) => {
<<<<<<< HEAD
            this.messageLogger?.logIn('grpc', BATTLE_GET_MANY_PATH, response, {spanId});
=======
            void this.messageLogger?.logIn(BATTLE_GET_MANY_PATH, response, extractTrackId(response));
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82

            return response;
        }).catch((err) => {
            logger.error("Get many battles failed:", err);

<<<<<<< HEAD
            this.messageLogger?.logIn(
                'grpc',
                BATTLE_GET_MANY_PATH,
                {error: (err as Error)?.message ?? String(err)},
                {spanId},
            );

=======
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
            return null;
        });
    }
}

export default BattleClient;
