import JobService from "../../../infrastructure/job/service";
import {StateStore} from "@shared/state-store";
import {WebSocket} from "ws";
import SocketContext from "../../../infrastructure/websocket/types/socket-context";
import * as streamingProto from "../../../contracts/proto/streaming";
import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";
import logger from "@shared/logger";

export class BattleConnectBotUseCase {
    constructor(
        private readonly jobService: JobService,
        private readonly wsSocketContextStateStore: StateStore<WebSocket, SocketContext>,
        private readonly battleWsStateStore: StateStore<string, Set<WebSocket>>,
        private readonly botConnectingRequest: string,
    ) {
    }

    async execute(
        profileId: ProfileId,
        battleId: BattleId,
    ): Promise<void> {

        const websockets = this.battleWsStateStore.get(battleId.value);
        if (!websockets) {
            // logger.log(battleId.value)
            return;
        }

        for (const websocket of websockets) {
            const context = this.wsSocketContextStateStore.get(websocket);
            if (profileId === context?.profileId) {
                const message = streamingProto.BattleJoinBot.create({battleId: battleId.value});
                await this.jobService.enqueue(this.botConnectingRequest, message);
            }
        }
    }
}

export default BattleConnectBotUseCase;
