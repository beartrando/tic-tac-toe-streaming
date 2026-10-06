import {WebSocket} from 'ws';
import logger from "@shared/logger";
import SocketEncoding from "../enums/socket-encoding";
import SocketContext from "../types/socket-context";
import StateStore from "../../state-store/state-stores/state-store";
import ProfileId from "../../../domain/profile/value-objects/profile-id.vo";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";


class BattleWebsocketsRegistry {
    constructor(
        private readonly wsSocketContextStateStore: StateStore<WebSocket, SocketContext>,
        private readonly battleWsStateStore: StateStore<string, Set<WebSocket>>,
    ) {
    }

    registerSocket(
        ws: WebSocket,
        profileId: ProfileId,
        encoding: SocketEncoding
    ) {
        const context = this.wsSocketContextStateStore.get(ws);

        if (context) {
            if (context.profileId !== profileId) {
                throw new Error(
                    `Broken socket context: expected profileId=${context.profileId}, got=${profileId}`,
                );
            }
            return;
        }

        logger.log('register socket ' + profileId);

        this.wsSocketContextStateStore.set(ws, {
            profileId,
            battleIds: new Set(),
            encoding,
        });
    }

    getSocketContext(ws: WebSocket): SocketContext | undefined {
        const context = this.wsSocketContextStateStore.get(ws);


        if (!context) {
            logger.warn("Socket is not registered");
            return undefined;
        }
        // logger.log(new Error().stack);

        return context;
    }

    hasSubscriptions(ws: WebSocket): boolean {
        const context = this.getSocketContext(ws);

        return context ? context.battleIds.size > 0 : false;
    }

    getBattleSockets(
        battleId: BattleId
    ): Set<WebSocket> | null {
        logger.log(this.battleWsStateStore);
        // logger.log(battleId);
        // logger.log(this.battleWsStateStore.get(battleId.value)?.size);
        return this.battleWsStateStore.get(battleId.value);
    }

    hasBattleSockets(
        battleId: BattleId,
    ): boolean {
        const sockets = this.battleWsStateStore.get(battleId.value);

        return Boolean(sockets && sockets.size > 0);
    }


    unregisterSocket(ws: WebSocket): void {
        // this.clearHeartbeat(ws);

        const context = this.wsSocketContextStateStore.get(ws);

        if (!context) {
            return;
        }

        for (const battleId of [...context.battleIds]) {
            this.unsubscribeWsBattle(ws, battleId);
        }

        this.wsSocketContextStateStore.delete(ws);

    }

    subscribeBattle(
        ws: WebSocket,
        battleId: BattleId,
    ) {
        const context = this.getSocketContext(ws);
        // logger.log(battleId);
        if (!context) {
            logger.warn(`Unable to subscribe socket to battle ${battleId}: socket is not registered`);
            return;
        }

        context.battleIds.add(battleId);

        let sockets = this.battleWsStateStore.get(battleId.value);

        if (!sockets) {
            sockets = new Set<WebSocket>();
        }

        sockets.add(ws);
        this.battleWsStateStore.set(battleId.value, sockets);
        logger.log(this.battleWsStateStore.keys());
    }

    unsubscribeBattle(battleId: BattleId) {
        const wsSet = this.getBattleSockets(battleId);

        if (!wsSet) {
            return;
        }

        for (const ws of [...wsSet]) {
            this.unsubscribeWsBattle(ws, battleId);
        }
    }

    unsubscribeWsBattle(
        ws: WebSocket,
        battleId: BattleId,
    ) {
        logger.log('unsubscribeBattle' + battleId.value);

        const context = this.getSocketContext(ws);

        if (!context) {
            logger.warn(`unsubscribeBattle: socket is not registered (battleId=${battleId})`,);
            return;
        }

        context.battleIds.delete(battleId);

        const sockets = this.getBattleSockets(battleId);

        if (!sockets) {
            return;
        }

        sockets.delete(ws);

        if (sockets.size === 0) {
            this.battleWsStateStore.delete(battleId.value);
        }
    }
}

export default BattleWebsocketsRegistry;
