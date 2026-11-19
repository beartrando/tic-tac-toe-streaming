export const messageConfig = {
    brokers: process.env.KAFKA_BROKERS?.split(',') ?? ['10.100.0.1:9092'],
    clientId: process.env.KAFKA_CLIENT_ID ?? 'auth-client',
    groupId: process.env.KAFKA_GROUP_ID ?? 'auth-service',
};

export const messageConsumersConfig: Record<string, string> = {};


export const messageProducersConfig: Record<string, string> = {
    userCreated: process.env.MESSAGE_TOPIC_USER_CREATED ?? 'user.created',
};


export default messageConfig;
