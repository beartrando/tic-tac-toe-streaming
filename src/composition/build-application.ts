import {WebSocket} from "ws";
import * as engineProto from "../contracts/proto/engine";

import Application from "../application/application";

// Application
import HealthUseCase from "../application/use-cases/health/health";
import StatusUseCase from "../application/use-cases/health/status";
import LivezUseCase from "../application/use-cases/health/livez";
import ReadyzUseCase from "../application/use-cases/health/readyz";

import AuthorizeProfileUseCase from "../application/use-cases/auth/authorize-profile";

import BattleInitUseCase from "../application/use-cases/battle/battle-init";
import BattleMoveUseCase from "../application/use-cases/battle/battle-move";
import BattleLeaveUseCase from "../application/use-cases/battle/battle-leave";
import BattleConnectBotUseCase from "../application/use-cases/battle/battle-connect-bot";
import BattleUpdatedUseCase from "../application/use-cases/battle/battle-updated";
import WebsocketDisconnectUseCase from "../application/use-cases/websocket/websocket-disconnect";

// Infrastructure
import AuthService from "../infrastructure/auth/service";
import GrpcService from "../infrastructure/grpc/service";
import JobService from "../infrastructure/job/service";
import MessageService from "../infrastructure/message/service";
import TimerService from "../infrastructure/timer/service";
import GrpcStreamService from "../infrastructure/grpc-stream/service";
import WebsocketServerService from "../infrastructure/websocket/server.service";

import ProfileClient from "../infrastructure/grpc/clients/profile.client";
import BattleClient from "../infrastructure/grpc/clients/battle.client";
import EngineStream from "../infrastructure/grpc-stream/channels/engine.stream";

import HealthHandler from "../infrastructure/grpc/handlers/health.handler";
import ConnectionHandler from "../infrastructure/websocket/connection.handler";
import BattleHandler from "../infrastructure/websocket/handlers/battle.handler";

import StateStore from "../infrastructure/state-store/state-stores/state-store";
import BattleWebsocketsRegistry from "../infrastructure/websocket/registers/battle-websockets.registry";

import TimerCallbackFactoryHolder from "../infrastructure/timer/callback-factory-holder";
import BattleTimeoutCallbackFactory from "../infrastructure/timer/callbacks/battle-timeout-callback-factory";
import SocketContext from "../infrastructure/websocket/types/socket-context";

// Config
import authConfig from "../infrastructure/auth/auth.config";
import grpcConfig from "../infrastructure/grpc/configs/grpc.config";
import jobConfig from "../infrastructure/job/job.config";
import messageConfig from "../infrastructure/message/configs/message.config";
import messageProducersConfig from "../infrastructure/message/configs/producers.config";
import websocketServerConfig from "../infrastructure/websocket/configs/websocket-server.config";
import BattleWebsocketSender from "../infrastructure/websocket/senders/battle-websocket.sender";
import timerConfig from "../infrastructure/timer/config/config";
import BattleStartUseCase from "../application/use-cases/battle/battle-start";


function buildApplication(): Application {
    /*
     * Infrastructure services
     */

    const authService = new AuthService(authConfig);

    const jobService = new JobService(
        jobConfig,
        messageConfig,
        messageProducersConfig,
    );

    const messageService = new MessageService(messageConfig);

    const timerCallbackFactoryHolder =
        new TimerCallbackFactoryHolder<WebSocket>();

    const timerService =
        new TimerService<WebSocket, WebSocket>(
            timerCallbackFactoryHolder,
            timerConfig.iddleWebsocketTimeLimit,
        );

    const grpcStreamService =
        new GrpcStreamService<engineProto.BattleRequest>();


    /*
     * External client
     */

    const profileClient =
        new ProfileClient(grpcConfig.serviceProfileUrl);

    const battleClient =
        new BattleClient(grpcConfig.serviceBattleUrl);


    /*
     * State
     */

    const socketContextStore =
        new StateStore<WebSocket, SocketContext>();

    const battleWebsocketsStore =
        new StateStore<string, Set<WebSocket>>();

    /*
     * WebSocket infrastructure
     */

    const battleWebsocketsRegistry = new BattleWebsocketsRegistry(socketContextStore, battleWebsocketsStore);

    const battleWebsocketSender = new BattleWebsocketSender(battleWebsocketsRegistry);


    /*
     * Application — auth
     */

    const authorizeProfileUseCase =
        new AuthorizeProfileUseCase(
            profileClient,
        );


    /*
     * Application — battle
     */

    const battleLeaveUseCase =
        new BattleLeaveUseCase(
            battleWebsocketsRegistry,
            grpcStreamService,
        );

    const battleCreateUseCase =
        new BattleInitUseCase(
            battleWebsocketSender,
            battleWebsocketsRegistry,
            battleClient,
        );

    const battleStartUseCase =
        new BattleStartUseCase(
            grpcStreamService,
        );

    const battleMoveUseCase =
        new BattleMoveUseCase(
            grpcStreamService,
        );

    const battleConnectBotUseCase =
        new BattleConnectBotUseCase(
            jobService,
            socketContextStore,
            battleWebsocketsStore,
            messageProducersConfig.botConnectingRequest,
        );

    const websocketDisconnectUseCase = new WebsocketDisconnectUseCase(
        battleWebsocketsRegistry,
        battleLeaveUseCase,
        timerService
    );

    /*
     * Timer callbacks
     */

    const battleTimeoutCallbackFactory = new BattleTimeoutCallbackFactory(websocketDisconnectUseCase);

    timerCallbackFactoryHolder.factory =
        battleTimeoutCallbackFactory;


    /*
     * WebSocket handlers
     */

    const battleHandler =
        new BattleHandler(
            timerService,
            battleCreateUseCase,
            battleStartUseCase,
            battleMoveUseCase,
            battleConnectBotUseCase,
            battleLeaveUseCase,
        );


    const connectionHandler =
        new ConnectionHandler(
            authService,
            authorizeProfileUseCase,
            websocketDisconnectUseCase,
            battleWebsocketsRegistry,
        );

    connectionHandler.registerHandler(
        "/battle",
        battleHandler,
    );

    const websocketService =
        new WebsocketServerService(
            websocketServerConfig,
            connectionHandler,
        );


    /*
     * Engine stream
     */

    const battleUpdatedUseCase = new BattleUpdatedUseCase(battleWebsocketSender, battleWebsocketsRegistry);

    const engineStream =
        new EngineStream(
            grpcConfig.serviceEngineUrl,
            battleUpdatedUseCase,
        );

    grpcStreamService.stream = engineStream;


    /*
     * Health
     */

    const healthUseCase =
        new HealthUseCase(
            jobService,
            messageService,
            websocketService,
            grpcStreamService,
        );

    const statusUseCase = new StatusUseCase();
    const livezUseCase = new LivezUseCase();
    const readyzUseCase = new ReadyzUseCase();

    const healthHandler =
        new HealthHandler(
            healthUseCase,
            statusUseCase,
            livezUseCase,
            readyzUseCase,
        );


    /*
     * gRPC
     */

    const grpcService =
        new GrpcService(
            grpcConfig.port,
            healthHandler,
        );


    /*
     * Application
     */

    return new Application(
        grpcService,
        jobService,
        messageService,
        websocketService,
        grpcStreamService,
    );
}

export default buildApplication;
