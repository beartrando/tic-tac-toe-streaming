import * as grpc from "@grpc/grpc-js";

import * as matchmakingProto from "../../../contracts/proto/matchmaking";
import * as battleProto from "../../../contracts/proto/battle";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import logger from "@shared/logger";
import {extractBattleId, extractTrackId, type MessageLogger} from "@shared/elastic";
import {MATCHMAKING_INIT_PATH} from "../grpc.constants";

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
        const spanId = this.messageLogger?.logOut(
            'grpc',
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
            this.messageLogger?.logIn('grpc', MATCHMAKING_INIT_PATH, response, {spanId});

            return response;
        }).catch((err) => {
            logger.error("Matchmaking init failed:", err);

            this.messageLogger?.logIn(
                'grpc',
                MATCHMAKING_INIT_PATH,
                {error: (err as Error)?.message ?? String(err)},
                {spanId},
            );

            return null;
        });
    }
}

export default MatchmakingClient;
