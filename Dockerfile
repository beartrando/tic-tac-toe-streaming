ARG VERSION=dev

# ---------- BASE ----------
FROM node:22-slim AS base

WORKDIR /usr/src/app

COPY shared ./shared
COPY proto ./proto

COPY pnpm-lock.yaml ./
COPY turbo.json ./
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

COPY services/server/streaming/package*.json ./services/server/streaming/
COPY services/server/streaming/jest.config.js ./services/server/streaming/
COPY services/server/streaming/jest.setup.ts ./services/server/streaming/
COPY services/server/streaming/tsconfig.json ./services/server/streaming/
COPY services/server/streaming/src ./services/server/streaming/src/

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssl \
        protobuf-compiler \
        libprotobuf-dev \
        wget \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.28.4 --activate


# ---------- DEPS ----------
FROM base AS deps

RUN pnpm fetch
RUN pnpm install --offline --frozen-lockfile --ignore-scripts

RUN mkdir -p ./services/server/streaming/src/contracts/proto
RUN pnpm --filter streaming proto:generate

RUN pnpm --filter @shared/logger build
RUN pnpm --filter @shared/cache-store build
RUN pnpm --filter @shared/state-store build
RUN pnpm --filter @shared/timer build
RUN pnpm --filter @shared/kafka-manager build
RUN pnpm --filter @shared/persistent-logger build
RUN pnpm --filter @shared/pg-boss-manager build
RUN pnpm --filter @shared/grpc-client-manager build
RUN pnpm --filter @shared/errors proto:generate
RUN pnpm --filter @shared/errors build
RUN pnpm --filter @shared/otel build

RUN pnpm --filter streaming prisma:generate


# ---------- DEV ----------
FROM deps AS dev

COPY services/server/streaming/tsconfig.test.json ./services/server/streaming/

ENV NODE_ENV=development

RUN chown -R node:node /usr/src/app

USER node

EXPOSE 50051
EXPOSE 8080

CMD ["pnpm", "--filter", "streaming", "dev"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD nc -z localhost 50051 || exit 1


# ---------- BUILD ----------
FROM deps AS build

ENV NODE_ENV=production

RUN pnpm --filter streaming build

RUN pnpm --filter streaming deploy /deploy --prod

RUN GENERATED_PRISMA_DIR=$(dirname "$(find /usr/src/app/node_modules/.pnpm -path "*/.prisma/client/default.js" | head -1)") \
    && PRISMA_PKG_DIR=$(find /deploy/node_modules/.pnpm -type d -name client -path "*@prisma*" | head -1) \
    && NODE_MODULES_DIR=$(dirname "$(dirname "$PRISMA_PKG_DIR")") \
    && mkdir -p "$NODE_MODULES_DIR/.prisma" \
    && rm -rf "$NODE_MODULES_DIR/.prisma/client" \
    && cp -r "$GENERATED_PRISMA_DIR" "$NODE_MODULES_DIR/.prisma/client" \
    && mkdir -p /deploy/node_modules/.prisma \
    && rm -rf /deploy/node_modules/.prisma/client \
    && cp -r "$GENERATED_PRISMA_DIR" /deploy/node_modules/.prisma/client


# ---------- PROD ----------
FROM node:22-slim AS prod

ARG VERSION=dev

ENV APP_VERSION=$VERSION
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssl \
        wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY --from=build /deploy/dist ./dist
COPY --from=build /deploy/node_modules ./node_modules

RUN printf "%s\n" "$VERSION" > VERSION

LABEL org.opencontainers.image.version="$VERSION"

USER node

EXPOSE 50051
EXPOSE 8080

CMD ["node", "dist/app.js"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD nc -z localhost 50051 || exit 1


# ---------- PREDEPLOY ----------
FROM node:22-slim AS predeploy

ARG VERSION=dev

ENV APP_VERSION=$VERSION
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssl \
        wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Только зависимости workspace, необходимые Prisma CLI
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/services/server/streaming/node_modules ./services/server/streaming/node_modules

# Только схема и миграции
COPY services/server/streaming/src/infrastructure/db/prisma ./services/server/streaming/src/infrastructure/db/prisma

RUN printf "%s\n" "$VERSION" > VERSION

LABEL org.opencontainers.image.version="$VERSION"

WORKDIR /usr/src/app/services/server/streaming

CMD ["./node_modules/.bin/prisma", "migrate", "deploy", "--schema=src/infrastructure/db/prisma/schema.prisma"]
