import {WebSocket} from 'ws';
import * as streamingProto from "../../../contracts/proto/streaming";
import WebsocketSenderInterface from "../interfaces/websocket-sender.interface";
import SocketEncoding from "../enums/socket-encoding";

export class WebsocketSender implements WebsocketSenderInterface {

    writeStream(
        ws: WebSocket,
        streamResponse: streamingProto.BattleResponse,
        encoding: SocketEncoding = SocketEncoding.PROTOBUF
    ): void {

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
