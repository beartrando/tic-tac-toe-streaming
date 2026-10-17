import type {ElasticConfig} from '@shared/elastic';

export const elasticConfig: ElasticConfig = {
    node: process.env.ELASTICSEARCH_URL ?? 'http://elasticsearch:9200',
    index: process.env.ELASTIC_INDEX ?? 'service-messages',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    enabled: (process.env.ELASTIC_ENABLED ?? 'true') !== 'false',
};

export default elasticConfig;
