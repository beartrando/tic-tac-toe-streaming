import type {PgBossConfig, WorkerHandler} from "@shared/pg-boss-manager";
import pgBossManager, {SqlExecutor} from '@shared/pg-boss-manager';
import logger from "@shared/logger";
import sleep from "../../utils/sleep";
import {KafkaConfig} from "@shared/kafka-manager";


export class JobService {
    private readonly workers = new Map<string, WorkerHandler<any>>();

    constructor(
        private readonly config: PgBossConfig,
        private readonly messageConfig: KafkaConfig,
        private readonly messageProducersConfig: Record<string, string>,
    ) {
    }

    async start(): Promise<void> {

        void pgBossManager.start(this.config);

        await pgBossManager.waitUntilReady();

        this.registerWorkers();

        await this.initKafkaBridge();
    }

    async initKafkaBridge(): Promise<void> {
        const topics = Object.values(this.messageProducersConfig);

        while (true) {
            try {
                await Promise.all(
                    topics.map(topic =>
                        pgBossManager.kafka.start(
                            this.messageConfig,
                            topic,
                        ),
                    ),
                );

                logger.info("✅ PgBoss Kafka bridge initialized");
                return;
            } catch (err) {
                logger.warn(
                    {err},
                    "⏳ Waiting for PgBoss/Kafka bridge initialization...",
                );

                await sleep(3000);
            }
        }
    }

    public registerWorker(
        topic: string,
        handler: WorkerHandler<any>,
    ): void {
        this.workers.set(topic, handler);
    }

    public async enqueue<T extends object>(
        topic: string,
        data: T,
    ): Promise<number> {
        const boss = await pgBossManager.waitUntilReady();

        return pgBossManager.queue.enqueue(topic, data)
    }

    public async enqueueTx<T extends object>(
        topic: string,
        data: T,
        tx: SqlExecutor,
    ): Promise<number> {
        const boss = await pgBossManager.waitUntilReady();

        return pgBossManager.queue.enqueueTx(topic, data, tx)
    }

    async stop() {
        return await pgBossManager.stop();
    }

    async check(): Promise<boolean> {
        return pgBossManager.check();
    }

    private registerWorkers(): void {
        for (const [topic, handler] of this.workers) {
            pgBossManager.workers.registerWorker(
                topic,
                handler,
            );
        }

        logger.info(
            `✅ Registered ${this.workers.size} workers`,
        );
    }

}

export default JobService;
