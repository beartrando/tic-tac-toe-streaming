import type {MessageLoggerConfig} from '@shared/persistent-logger';

export const persistentLoggerMessagesConfig: MessageLoggerConfig = {
    service: process.env.APP_NAME ?? 'streaming',
    index: process.env.ELASTIC_MESSAGES_INDEX ?? 'service-messages',
};

export default persistentLoggerMessagesConfig;
