export const messageConfig = {
    brokers: process.env.KAFKA_BROKERS?.split(',') ?? ['10.100.0.1:9092'],
    clientId: process.env.KAFKA_CLIENT_ID ?? 'streaming-client',
    groupId: process.env.KAFKA_GROUP_ID ?? 'streaming-service',
};


export default messageConfig;
