import * as engineProto from '../../../contracts/proto/engine';
import * as grpc from '@grpc/grpc-js';
import logger from "@shared/logger";
import {extractTrackId, type MessageLogger} from "@shared/elastic";
import BattleUpdatedUseCase from "../../../application/use-cases/battle/battle-updated";
import StreamInterface from "../interfaces/stream.interface";
import {ENGINE_BATTLE_CHANNEL_PATH} from "../../grpc/grpc.constants";


export class EngineStream implements StreamInterface<engineProto.BattleRequest> {
    private stream: grpc.ClientDuplexStream<any, any> | null = null;
    private client: engineProto.EngineClient | null = null;
    private reconnectDelay = 1000;
    private maxDelay = 10000;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private heartbeatPeriod = 5000;
    private reconnectScheduled = false;

    constructor(
        private readonly serviceEngineUrl: string,
        private readonly battleUpdatedUseCase: BattleUpdatedUseCase,
        private readonly messageLogger?: MessageLogger,
    ) {
    }

    getEngineStream = () => {
        if (!this.stream) {
            throw new Error('Engine stream is not initialized');
        }

        return this.stream;
    }

    connect = () => {
        if (this.stream) {
            logger.log('Garbage stream was cancelled...')
            this.stream.cancel?.();
            this.stopHeartbeat();
        }

        logger.log('Connection stream engine...')

        this.client = new engineProto.EngineClient(
            this.serviceEngineUrl,
            grpc.credentials.createInsecure()
        );

        this.stream = this.client.battleChannel();


        const channel = this.client.getChannel();

        logger.log(
            'Engine gRPC state:',
            channel.getConnectivityState(true)
        );

        let previousState = -1;
        const watchGrpcState = () => {
            const state = channel.getConnectivityState(false);

            if (previousState != state) {
                logger.log('Engine gRPC state:', state);
                previousState = state;
            }

            channel.watchConnectivityState(
                state,
                Date.now() + 5000,
                () => watchGrpcState(),
            );
        };

        watchGrpcState();


        this.stream.on('data', (message: engineProto.BattleResponse) => {

            try {

                this.reconnectDelay = 1000

                if (message.ping) {
                    return;
                }
                logger.log(message);

                if (message.battle) {
                    void this.messageLogger?.logIn(
                        'grpc',
                        ENGINE_BATTLE_CHANNEL_PATH,
                        message,
                        extractTrackId(message),
                    );

                    this.battleUpdatedUseCase.execute(message.battle, message.trackId);
                }
            } catch (e) {
                logger.log(e);
            }

        });

        const handleDisconnect = () => {
            this.stopHeartbeat();
            this.scheduleReconnect();
        };

        this.stream.on('error', (err) => {
            console.error('Stream error:', err);

            this.stopHeartbeat();
            handleDisconnect();
        });

        this.stream.on('end', () => {
            console.warn('Stream ended');
            handleDisconnect();
        });

        this.stream.on('close', () => {
            console.warn('Stream closed');
            handleDisconnect();
        });


        this.startHeartbeat();

        return this.stream;
    }


    disconnect(): void {
        this.stopHeartbeat();
        this.stream?.cancel();
        this.stream = null;
        this.client = null;
    }

    write(data: engineProto.BattleRequest) {
        // logger.info(data);
        if (!this.stream) {
            throw new Error('Engine stream not initialized');
        }

        if (!data.ping) {
            void this.messageLogger?.logOut(
                'grpc',
                ENGINE_BATTLE_CHANNEL_PATH,
                data,
                extractTrackId(data),
            );
        }

        this.stream.write(data);
    }

    scheduleReconnect = () => {

        if (this.reconnectScheduled) {
            return;
        }

        this.reconnectScheduled = true;

        // logger.log('scheduleReconnect', this.reconnectDelay);
        this.stopHeartbeat();
        setTimeout(() => {

            this.reconnectScheduled = false;
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);

            this.connect();
        }, this.reconnectDelay);
    }

    startHeartbeat = () => {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.stream) {
                // logger.log('ping engine stream');
                this.stream.write({
                    ping: {timestamp: new Date()}
                });
            }
        }, this.heartbeatPeriod); // каждые 5 секунд
    }

    stopHeartbeat = () => {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}

export default EngineStream;
