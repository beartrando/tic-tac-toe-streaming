import {WebSocket} from "ws";
import TimerCallbackInterface from "../interfaces/timer-callback.interface";
import TimerCallbackFactoryInterface from "../interfaces/timer-callback-factory.interface";
import WebsocketDisconnectUseCase from "../../../application/use-cases/websocket/websocket-disconnect";

/**
 * Колбэк WS-idle таймера (ключ — сам сокет). Отключение по простояму
 * сокета исторически отключено — тело оставлено как на dev.
 */
export class WebsocketTimeoutCallbackFactory implements TimerCallbackFactoryInterface<WebSocket> {

    constructor(
        private readonly websocketDisconnectUseCase: WebsocketDisconnectUseCase,
    ) {
    }

    create(ws: WebSocket): TimerCallbackInterface {
        return async () => {
            // await this.websocketDisconnectUseCase.execute(ws);
        };
    }
}

export default WebsocketTimeoutCallbackFactory;
