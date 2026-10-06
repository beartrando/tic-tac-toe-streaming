import * as grpc from "@grpc/grpc-js";
import logger from "@shared/logger";

import * as battleProto from "../../../contracts/proto/battle";
import BattleClient from "../../../infrastructure/grpc/clients/battle.client";
import BattleProtoMapper from "../../../infrastructure/grpc/mappers/battle.proto.mapper";
import BattleWebsocketsRegistry from "../../../infrastructure/websocket/registers/battle-websockets.registry";
import BattleWebsocketSender from "../../../infrastructure/websocket/senders/battle-websocket.sender";
import BattleId from "../../../domain/battle/value-objects/battle-id.vo";

/**
 * Один цикл опроса battle-сервиса о конкретном баттле.
 *
 * Если баттл стал терминальным (Finished/Cancelled/TimeOut) — финальный
 * статус пушится клиентам, сокеты отписываются от баттла.
 *
 * @returns true — наблюдать за баттлом больше не нужно (терминальный статус
 *          либо сокетов на баттл не осталось); false — баттл жив, опрос
 *          продолжается.
 */
export class BattleTimeoutCheckUseCase {
    constructor(
        private readonly battleClient: BattleClient,
        private readonly battleWebsocketsRegistry: BattleWebsocketsRegistry,
        private readonly battleWebsocketSender: BattleWebsocketSender,
    ) {
    }

    async execute(battleId: BattleId): Promise<boolean> {
        if (!this.battleWebsocketsRegistry.hasBattleSockets(battleId)) {
            return true;
        }

        const response = await this.battleClient.getMany(
            battleProto.BattleIdsRequest.create({battleIds: [battleId.value]}),
            new grpc.Metadata(),
        );

        if (!response?.battles) {
            logger.warn(`⏱ Battle timeout check: no battles in response (requested=${battleId.value})`);
            return false;
        }

        for (const battleObject of response.battles.items) {
            const battle = BattleProtoMapper.toDomain(battleObject);

            if (!battle.isTerminated()) {
                continue;
            }

            this.battleWebsocketSender.send(battleObject);
            this.battleWebsocketsRegistry.unsubscribeBattle(battle.id);

            logger.info(
                `⏱ Battle ${battleObject.id} is terminated (status=${battleObject.status}): sockets unsubscribed`,
            );

            return true;
        }

        return false;
    }
}

export default BattleTimeoutCheckUseCase;
