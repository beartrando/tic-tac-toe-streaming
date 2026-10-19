import type {MessageLoggerConfig} from '@shared/message-logger';

export const messagesConfig: MessageLoggerConfig = {
    service: process.env.APP_NAME ?? 'streaming',
    index: process.env.ELASTIC_MESSAGES_INDEX ?? 'service-messages',
};

export default messagesConfig;
