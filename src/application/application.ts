import logger from "@shared/logger";
<<<<<<< HEAD
import {messageIndexTemplate, type ElasticService} from "@shared/elastic";
=======
import type {ElasticService} from "@shared/persistent-logger";
>>>>>>> 65a7841a75ca74b18f25620acc682f5bae881b82
import GrpcService from "../infrastructure/grpc/service";
import JobService from "../infrastructure/job/service";
import MessageService from "../infrastructure/message/service";
import WebsocketServerService from "../infrastructure/websocket/server.service";
import GrpcStreamService from "../infrastructure/grpc-stream/service";
import {TimerService} from "@shared/timer";
import * as engineProto from "../contracts/proto/engine";
import {WebSocket,} from "ws";
import messagesConfig from "../infrastructure/elastic/messages.config";

export class Application {
    constructor(
        private readonly grpcService: GrpcService,
        private readonly jobService: JobService,
        private readonly messageService: MessageService,
        private readonly websocketService: WebsocketServerService,
        private readonly engineStreamService: GrpcStreamService<engineProto.BattleRequest>,
        private readonly elasticService: ElasticService,
    ) {
    }

    async start(): Promise<void> {
        const shutdown = async () => {
            logger.info("🛑 Shutting down...");

            await this.stop();

            process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        try {
            await this.messageService.start();
            await this.jobService.start();
            await this.grpcService.start();
            await this.websocketService.start();
            await this.engineStreamService.start();

            if (!await this.elasticService.check()) {
                logger.warn(
                    '⚠️ Elasticsearch is unavailable, messages will not be indexed',
                );
            }

            await this.elasticService.ensureIndexTemplates([
                messageIndexTemplate(messagesConfig.index),
            ]);

            logger.info(
                '🚀 Streaming service started',
            );
        } catch (err) {
            logger.error(
                {err},
                '💥 Failed to start Streaming service',
            );
            process.exit(1);
        }
    }

    async stop() {
        await this.engineStreamService.stop();
        await this.websocketService.stop();
        await this.grpcService.stop();
        await this.jobService.stop();
        await this.messageService.stop();
        await this.elasticService.stop();
    }
}

export default Application;
