import * as grpc from "@grpc/grpc-js";

import * as authProto from "../../../contracts/proto/auth";
import * as profileProto from "../../../contracts/proto/profile";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import {extractTrackId, type MessageLogger} from "@shared/elastic";
import {PROFILE_GET_BY_USER_PATH} from "../grpc.constants";

export class ProfileClient {
    private readonly manager: GrpcClientManager<profileProto.ProfileClient>;

    constructor(
        private readonly url: string,
        private readonly messageLogger?: MessageLogger,
    ) {
        this.manager = new GrpcClientManager(
            () =>
                new profileProto.ProfileClient(
                    this.url,
                    grpc.credentials.createInsecure(),
                ),
        );
    }

    async getByUser(
        request: authProto.UserIdRequest,
        metadata: grpc.Metadata,
    ): Promise<profileProto.ProfileResponse | null> {
        const spanId = this.messageLogger?.logOut(
            'grpc',
            PROFILE_GET_BY_USER_PATH,
            request,
            {trackId: extractTrackId(request)},
        );

        try {
            const response = await this.manager.call<profileProto.ProfileResponse>(
                (client, callback) => client.getByUser(request, metadata, callback),
            );

            this.messageLogger?.logIn('grpc', PROFILE_GET_BY_USER_PATH, response, {spanId});

            return response;
        } catch (err) {
            this.messageLogger?.logIn(
                'grpc',
                PROFILE_GET_BY_USER_PATH,
                {error: (err as Error)?.message ?? String(err)},
                {spanId},
            );

            throw err;
        }
    }
}


export default ProfileClient;
