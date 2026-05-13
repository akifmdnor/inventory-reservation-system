# syntax=docker/dockerfile:1
# API (workspace server). Build context must be the monorepo root (..).
FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
# postinstall runs `prisma generate`; schema must exist before `npm ci`
COPY server/prisma ./server/prisma
COPY web-client/package.json ./web-client/

RUN npm ci

COPY server ./server

RUN cd server && npx prisma generate && npm run build

# ---

FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/web-client/package.json ./web-client/package.json

WORKDIR /app/server

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
