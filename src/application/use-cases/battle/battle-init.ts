import {WebSocket} from 'ws';
import * as matchmakingProto from "../../../contracts/proto/matchmaking";

import BattleWebsocketsRegistry from "../../../infrastructure/websocket/registers/battle-websockets.registry";
import SessionAccessToken from "../../../domain/session/value-objects/session-access-token.vo";
import MatchmakingClient from "../../../infrastructure/grpc/clients/matchmaking.client";
import AuthHelper from "../../../infrastructure/grpc/helpers/auth.helper";
import BattleWebsocketSender from "../../../infrastructure/websocket/senders/battle-websocket.sender";
import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";

export class BattleInitUseCase {
    constructor(
        private readonly battleWebsocketSender: BattleWebsocketSender,
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly matchmakingClient: MatchmakingClient,
    ) {
    }

    async execute(
        ws: WebSocket,
        accessToken: SessionAccessToken,
        profileId: ProfileId,
        battleId?: BattleId,
    ): Promise<void> {

        const grpcRequest = matchmakingProto.BattleInitRequest.create({
            profileId: profileId.value,
            battleId: battleId ? battleId.value : undefined
        });
        const metadata = AuthHelper.getMetadata(accessToken);

        const battleResponse = await this.matchmakingClient.init(grpcRequest, metadata);

        if (!battleResponse?.battle) {
            return;
        }

        this.battleWebsocketsRegistry.subscribeBattle(ws, new BattleId(battleResponse.battle.id));

        this.battleWebsocketSender.send(battleResponse.battle);

    }
}

export default BattleInitUseCase;
