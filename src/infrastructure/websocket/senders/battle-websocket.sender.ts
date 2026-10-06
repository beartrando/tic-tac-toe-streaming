import * as streamingProto from "../../../contracts/proto/streaming";
import * as battleProto from "../../../contracts/proto/battle";
import BattleWebsocketsRegistry from "../registers/battle-websockets.registry";
import WebsocketSender from "./websocket.sender";
import SocketEncoding from "../enums/socket-encoding";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";
import logger from "@shared/logger";

export class BattleWebsocketSender extends WebsocketSender {
    constructor(
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
    ) {
        super();
    }

    send(battleObject: battleProto.BattleObject) {
        // logger.error(new Error().stack);
        logger.log(battleObject);
        // logger.log(new BattleId(battleObject.id));
        const sockets = this.battleWebsocketsRegistry.getBattleSockets(new BattleId(battleObject.id));

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
