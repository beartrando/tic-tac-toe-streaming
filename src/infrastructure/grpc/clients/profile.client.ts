import * as grpc from "@grpc/grpc-js";

import * as authProto from "../../../contracts/proto/auth";
import * as profileProto from "../../../contracts/proto/profile";

import {GrpcClientManager} from "@shared/grpc-client-manager";
import {type MessageLogger} from "@shared/persistent-logger";
import {PROFILE_GET_BY_USER_PATH} from "../../persistent-logger/stream-constants";

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
        void this.messageLogger?.logOut(
            PROFILE_GET_BY_USER_PATH,
            request,
        );

        try {
            const response = await this.manager.call<profileProto.ProfileResponse>(
                (client, callback) => client.getByUser(request, metadata, callback),
            );

            void this.messageLogger?.logIn(PROFILE_GET_BY_USER_PATH, response);

            return response;
        } catch (err) {
            void this.messageLogger?.logIn(
                PROFILE_GET_BY_USER_PATH,
                {error: (err as Error)?.message ?? String(err)},
            );

            throw err;
        }
    }
}


export default ProfileClient;
