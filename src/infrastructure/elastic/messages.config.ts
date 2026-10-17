import type {MessageLoggerConfig} from '@shared/elastic';

export const messagesConfig: MessageLoggerConfig = {
    service: process.env.APP_NAME ?? 'streaming',
    index: process.env.ELASTIC_MESSAGES_INDEX ?? 'service-messages',
};

export default messagesConfig;
