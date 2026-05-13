# syntax=docker/dockerfile:1
# Static Vite build + nginx, proxying /api to the Compose `api` service.
# Build context must be the monorepo root (..).
FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma
COPY web-client/package.json ./web-client/

RUN npm ci

COPY web-client ./web-client

RUN npm run build -w web-client

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/web-client/dist /usr/share/nginx/html
COPY web-client/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
