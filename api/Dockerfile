# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

ENV DATABASE_URL=mongodb://build:build@127.0.0.1:27017/build
RUN npm run build && \
    mkdir -p dist/generated/prisma && \
    find src/generated/prisma -maxdepth 1 -type f -name '*.node' -exec cp -t dist/generated/prisma/ {} +

FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY prisma ./prisma
COPY assets ./assets
COPY emails ./emails

EXPOSE 3000

CMD ["node", "dist/server.js"]
