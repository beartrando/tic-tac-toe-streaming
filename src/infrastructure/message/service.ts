import {createConsumer, createProducer, KafkaConfig, KafkaProducer} from "@shared/kafka-manager";
import logger from "@shared/logger";
import sleep from "../../utils/sleep";
import MessageConsumerHandlerInterface from "./interfaces/message-consumer-handler.interface";
import MessageConsumerInterface from "./interfaces/message-consumer.interface";

export class MessageService {

    private producer?: KafkaProducer;
    private readonly consumers: MessageConsumerInterface<any>[] = [];

    constructor(
        private readonly config: KafkaConfig,
    ) {
    }

    async start(): Promise<void> {
        await this.retryInit(() => this.createConsumers());
    }

    async stop(): Promise<void> {
        if (this.producer) {
            await this.producer.disconnect();
        }
    }

    async getProducer(): Promise<KafkaProducer> {
        if (!this.producer) {
            this.producer = await createProducer(this.config);
        }

        return this.producer;
    }

    async check(): Promise<boolean> {
        try {
            const producer = await this.getProducer();

            // await producer.send('healthcheck', [{value: 'ping'}]);
            await producer.send('healthcheck', 'ping');

            return true;
        } catch (err) {
            logger.error("Kafka health check failed", err);
            return false;
        }
    }

    addConsumer(topic: string, handler: MessageConsumerHandlerInterface<any>): void {
        const consumer: MessageConsumerInterface<any> = {topic, handler};
        this.consumers.push(consumer);
    }

    private async createConsumers(): Promise<void> {
        // logger.log(this.consumers);
        for (const consumer of this.consumers) {
            await createConsumer(
                {
                    ...this.config,
                    groupId: `${this.config.groupId}-${consumer.topic}`,
                },
                consumer,
            );
        }
    }

    private async retryInit(
        fn: () => Promise<void>,
    ): Promise<void> {
        while (true) {
            try {
                await fn();

                logger.info("✅ Kafka initialized");
                return;
            } catch (err) {
                logger.warn(
                    {err},
                    "⏳ Waiting for Kafka topics...",
                );

                await sleep(3000);
            }
        }
    }
}

export default MessageService;
