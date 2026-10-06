import * as streamingProto from "../../../contracts/proto/streaming";
import * as battleProto from "../../../contracts/proto/battle";
import BattleWebsocketsRegistry from "../registers/battle-websockets.registry";
import WebsocketSender from "./websocket.sender";
import SocketEncoding from "../enums/socket-encoding";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";
import logger from "@shared/logger";
import TimerService from "../../timer/service";

export class BattleWebsocketSender extends WebsocketSender {
    constructor(
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly battleTimerService: TimerService<string, BattleId>,
    ) {
        super();
    }

    send(battleObject: battleProto.BattleObject) {
        // logger.error(new Error().stack);
        const battleId = new BattleId(battleObject.id);

        // исходящий пакет по баттлу — активность, простой начинается заново
        this.battleTimerService.restart(battleId.value, battleId);

        logger.log(battleObject);
        // logger.log(new BattleId(battleObject.id));
        const sockets = this.battleWebsocketsRegistry.getBattleSockets(battleId);

        // logger.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!----------------------------!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

        // logger.log(sockets?.size);

        if (!sockets) {
            return;
        }

        const streamResponse = streamingProto.BattleResponse.create({battle: battleObject})

        for (const ws of sockets) {
            const context = this.battleWebsocketsRegistry.getSocketContext(ws);
            this.writeStream(ws, streamResponse, context?.encoding ?? SocketEncoding.PROTOBUF);
            // logger.log('----');
            // logger.log(streamResponse);
            // logger.log('------------------------------------------------------------------------------------------------------------');

        }
    }
}

export default BattleWebsocketSender;
