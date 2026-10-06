import * as healthProto from "../../../contracts/proto/common/health";
import MessageService from "../../../infrastructure/message/service";
import JobService from "../../../infrastructure/job/service";
import appConfig from "../../../infrastructure/app/app.config";
// import StateStoreService from "../../../infrastructure/state-store/service";
import WebsocketServerService from "../../../infrastructure/websocket/server.service";
import GrpcStreamService from "../../../infrastructure/grpc-stream/service";
import * as engineProto from "../../../contracts/proto/engine";

export class HealthUseCase {
    constructor(
        private readonly jobService: JobService,
        private readonly messageService: MessageService,
        private readonly websocketService: WebsocketServerService,
        private readonly engineStreamService: GrpcStreamService<engineProto.BattleRequest>,
    ) {
    }

    async execute(): Promise<healthProto.HealthReport> {
        const [jobOk, messageOk, websocketOk, engineStreamOk] = await Promise.all([
            this.jobService.check(),
            this.messageService.check(),
            this.websocketService.check(),
            this.engineStreamService.check(),
        ]);

        const components = {
            job: jobOk,
            message: messageOk,
            websocket: websocketOk,
            engineStream: engineStreamOk,
        };

        return {
            service: appConfig.appName,
            status: this.toHealthStatus(
                Object.values(components).every(Boolean),
            ),
            components: Object.fromEntries(
                Object.entries(components).map(([name, ok]) => [
                    name,
                    this.toHealthStatus(ok),
                ]),
            ),
            timestamp: new Date(),
        };
    }

    private toHealthStatus(ok: boolean): healthProto.HealthStatus {
        return ok
            ? healthProto.HealthStatus.HEALTH_STATUS_OK
            : healthProto.HealthStatus.HEALTH_STATUS_FAIL;
    }
}

export default HealthUseCase;
