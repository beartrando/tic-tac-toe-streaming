import {WebSocket} from "ws";
import BattleWebsocketsRegistry from "../../../infrastructure/websocket/registers/battle-websockets.registry";
import BattleLeaveUseCase from "../battle/battle-leave";
import {TimerService} from "@shared/timer";

export class WebsocketDisconnectUseCase {
    constructor(
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly battleLeaveUseCase: BattleLeaveUseCase,
        private readonly timerService: TimerService<WebSocket, WebSocket>,
    ) {
    }

    async execute(ws: WebSocket): Promise<void> {
        const context = this.battleWebsocketsRegistry.getSocketContext(ws);

        if (!context) {
            return;
        }

        try {
            await Promise.allSettled(
                [...context.battleIds].map(battleId => this.battleLeaveUseCase.execute(context.profileId, battleId))
            );
        } finally {
            this.timerService.stop(ws);
            this.battleWebsocketsRegistry.unregisterSocket(ws);

            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }
    }
}

export default WebsocketDisconnectUseCase;
