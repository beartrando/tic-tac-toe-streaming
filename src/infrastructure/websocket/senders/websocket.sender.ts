import {WebSocket} from 'ws';
import * as streamingProto from "../../../contracts/proto/streaming";
import {extractTrackId, type MessageLogger} from "@shared/elastic";
import WebsocketSenderInterface from "../interfaces/websocket-sender.interface";
import SocketEncoding from "../enums/socket-encoding";
import {BATTLE_WS_ROUTE} from "../websocket.constants";

export class WebsocketSender implements WebsocketSenderInterface {

    constructor(
        private readonly messageLogger?: MessageLogger,
    ) {
    }

    writeStream(
        ws: WebSocket,
        streamResponse: streamingProto.BattleResponse,
        encoding: SocketEncoding = SocketEncoding.PROTOBUF
    ): void {

        void this.messageLogger?.logOut(
            'websocket',
            BATTLE_WS_ROUTE,
            streamResponse,
            extractTrackId(streamResponse),
        );

        // logger.log(streamResponse);
        const buffer =
            encoding === SocketEncoding.PROTOBUF
                ? streamingProto.BattleResponse.encode(streamResponse).finish()
                : JSON.stringify(streamResponse);

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(buffer);
        }
    }
}

export default WebsocketSender;
