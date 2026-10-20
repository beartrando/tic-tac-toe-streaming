import {WebSocket} from 'ws';
import * as streamingProto from "../../../contracts/proto/streaming";
<<<<<<< HEAD
import {currentSpan, extractBattleId, extractTrackId, type MessageLogger} from "@shared/elastic";
=======
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
import WebsocketSenderInterface from "../interfaces/websocket-sender.interface";
import SocketEncoding from "../enums/socket-encoding";

export class WebsocketSender implements WebsocketSenderInterface {

    writeStream(
        ws: WebSocket,
        streamResponse: streamingProto.BattleResponse,
        encoding: SocketEncoding = SocketEncoding.PROTOBUF
    ): void {

<<<<<<< HEAD
        this.messageLogger?.logOut(
            'websocket',
            BATTLE_WS_ROUTE,
            streamResponse,
            {
                spanId: currentSpan()?.spanId,
                battleId: extractBattleId(streamResponse),
                trackId: extractTrackId(streamResponse),
            },
        );

=======
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
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
