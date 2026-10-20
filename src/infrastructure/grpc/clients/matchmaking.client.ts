import * as grpc from "@grpc/grpc-js";

import * as matchmakingProto from "../../../contracts/proto/matchmaking";
import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";
<<<<<<< HEAD
import {extractBattleId, extractTrackId, type MessageLogger} from "@shared/elastic";
import {MATCHMAKING_INIT_PATH} from "../grpc.constants";
=======
import {extractTrackId, type MessageLogger} from "@shared/persistent-logger";
import {MATCHMAKING_INIT_PATH} from "../../persistent-logger/stream-constants";
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82

export class MatchmakingClient {
    private readonly manager: GrpcClientManager<matchmakingProto.MatchmakingClient>;

    constructor(
        private readonly url: string,
        private readonly messageLogger?: MessageLogger,
    ) {
        this.manager = new GrpcClientManager(
            () => new matchmakingProto.MatchmakingClient(this.url, grpc.credentials.createInsecure()),
        );
    }

    async init(
        request: matchmakingProto.BattleInitRequest,
        metadata: grpc.Metadata,
    ): Promise<battleProto.BattleResponse | null> {
<<<<<<< HEAD
        const spanId = this.messageLogger?.logOut(
            'grpc',
=======
        void this.messageLogger?.logOut(
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
            MATCHMAKING_INIT_PATH,
            request,
            {
                trackId: extractTrackId(request),
                battleId: extractBattleId(request),
            },
        );

        return this.manager.call<battleProto.BattleResponse>(
            (client, cb) => client.init(request, metadata, cb)
        ).then((response) => {
<<<<<<< HEAD
            this.messageLogger?.logIn('grpc', MATCHMAKING_INIT_PATH, response, {spanId});
=======
            void this.messageLogger?.logIn(MATCHMAKING_INIT_PATH, response, extractTrackId(response));
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82

            return response;
        }).catch((err) => {
            logger.error("Matchmaking init failed:", err);

<<<<<<< HEAD
            this.messageLogger?.logIn(
                'grpc',
                MATCHMAKING_INIT_PATH,
                {error: (err as Error)?.message ?? String(err)},
                {spanId},
=======
            void this.messageLogger?.logIn(
                MATCHMAKING_INIT_PATH,
                {error: (err as Error)?.message ?? String(err)},
                extractTrackId(request),
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
            );

            return null;
        });
    }
}

export default MatchmakingClient;
