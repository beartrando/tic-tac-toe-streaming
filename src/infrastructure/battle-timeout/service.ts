import * as grpc from "@grpc/grpc-js";
import logger from "@shared/logger";

import * as battleProto from "../../contracts/proto/battle";
import BattleClient from "../grpc/clients/battle.client";
import BattleProtoMapper from "../grpc/mappers/battle.proto.mapper";
import BattleWebsocketsRegistry from "../websocket/registers/battle-websockets.registry";
import BattleWebsocketSender from "../websocket/senders/battle-websocket.sender";
import BattleId from "../../domain/battle/value-objects/battle-id.vo";
import BattleActivityTracker from "./battle-activity.tracker";

/**
 * По таймеру опрашивает battle-сервис о баттлах, по которым не было пакетов
 * дольше `idleTimeoutSeconds`. Как только прошло `idleTimeoutSeconds` простоя,
 * опрос идёт каждые `pollIntervalSeconds`, пока баттл не станет терминальным:
 * тогда клиентам пушится BattleResponse с финальным статусом, сокеты
 * отписываются от баттла.
 */
export class BattleTimeoutPollService {
    private timer: NodeJS.Timeout | null = null;
    private running = false;

    constructor(
        private readonly activityTracker: BattleActivityTracker,
        private readonly battleClient: BattleClient,
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly battleWebsocketSender: BattleWebsocketSender,
        private readonly idleTimeoutSeconds: number,
        private readonly pollIntervalSeconds: number,
    ) {
    }

    start(): void {
        if (this.timer) {
            return;
        }

        this.timer = setInterval(
            () => void this.poll(),
            1000 * this.pollIntervalSeconds,
        );

        logger.info(
            `⏱ Battle timeout poll started: idle=${this.idleTimeoutSeconds}s, interval=${this.pollIntervalSeconds}s`,
        );
    }

    async poll(): Promise<void> {
        if (this.running) {
            return;
        }

        this.running = true;

        try {
            const staleBattleIds = this.activityTracker
                .stale(this.idleTimeoutSeconds * 1000)
                .filter((battleId) => {
                    if (this.battleWebsocketsRegistry.hasBattleSockets(new BattleId(battleId))) {
                        return true;
                    }

                    this.activityTracker.forget(battleId);
                    return false;
                });

            if (staleBattleIds.length === 0) {
                return;
            }

            const response = await this.battleClient.getMany(
                battleProto.BattleIdsRequest.create({battleIds: staleBattleIds}),
                new grpc.Metadata(),
            );

            if (!response?.battles) {
                logger.warn(
                    `⏱ Battle timeout poll: no battles in response (${staleBattleIds.length} requested)`,
                );
                return;
            }

            for (const battleObject of response.battles.items) {
                const battle = BattleProtoMapper.toDomain(battleObject);

                if (!battle.isTerminated()) {
                    // Баттл жив — остаёмся в опросе (каждые pollIntervalSeconds),
                    // пока по нему не начнут идти пакеты или он не завершится.
                    continue;
                }

                this.battleWebsocketSender.send(battleObject);
                this.battleWebsocketsRegistry.unsubscribeBattle(battle.id);
                this.activityTracker.forget(battleObject.id);

                logger.info(
                    `⏱ Battle ${battleObject.id} is terminated (status=${battleObject.status}): sockets unsubscribed`,
                );
            }
        } catch (err) {
            logger.error({err}, "💥 Battle timeout poll failed");
        } finally {
            this.running = false;
        }
    }

    stop(): void {
        if (!this.timer) {
            return;
        }

        clearInterval(this.timer);
        this.timer = null;
    }
}

export default BattleTimeoutPollService;
