import * as healthProto from "../../../contracts/proto/common/health";

export class LivezUseCase {
    async execute(): Promise<healthProto.LiveStatus> {
        return {
            live: true,
        };
    }
}


export default LivezUseCase;
