# Inventory Reservation System

Local-first inventory and reservations with **PostgreSQL** (source of truth), **Redis** (Lua atomic guard and TTL holds), **Express + TypeScript**, and a **premium ecommerce** React (Vite + Tailwind) UI.

## Quick start

```bash
cd inventory-reservation-system
npm install
cp server/.env.example server/.env
npm run db:up
cd server && npx prisma migrate deploy && npx prisma db seed && cd ..
npm run dev
```

- **API:** http://localhost:3002  
- **UI:** http://localhost:5174 (proxies `/api` to the server)  
- **Postgres:** localhost:5434  
- **Redis:** localhost:6379 (Docker image enables `notify-keyspace-events Ex` for hold expiry)

`npm run db:up` starts **Postgres and Redis only** (see `server/docker-compose.yml`) so `npm run dev` can bind the API on 3002 without port clashes.

## Full stack in Docker (UI + API + Postgres + Redis)

Stack files: `server/Dockerfile` (API), `web-client/Dockerfile` (static UI + nginx), and `server/docker-compose.yml` (Postgres, Redis, `api`, `web`). The repo root `docker-compose.yml` includes the server stack for one-command runs.

```bash
cd inventory-reservation-system
npm run docker:up
# or: docker compose up -d --build
```

- **App (UI + API proxy):** http://localhost:8080  
- **API direct (optional):** http://localhost:3002  
- **Postgres:** localhost:5434 · **Redis:** localhost:6379  

For local development without Docker for Node, use `npm run dev` — Vite on http://localhost:5174 proxies `/api` to `localhost:3002`.

To stop: `docker compose down`

## Architecture: Guard and commit

1. **Concurrency (Redis):** A Lua script atomically checks available stock, `DECRBY`s the hot counter, and sets `inv:hold:{reservationId}` with a TTL (default 120s from `RESERVATION_TTL_SECONDS`).
2. **Reservation lifecycle (Postgres):** States `ACTIVE`, `CONFIRMED`, `CANCELLED`, `EXPIRED`. Ledger rows record `RESERVE`, `CONFIRM`, `CANCEL`, `EXPIRE`.
3. **Availability (business rule):**  
   `Available = TotalStock − ConfirmedQty − ActiveReservationQty`  
   The Redis counter is reconciled to this value after mutations and on startup.

**TTL expiry:** A subscriber listens for Redis key expirations on `inv:hold:*` and calls `onHoldExpired`, which marks the reservation `EXPIRED`, appends ledger, and reconciles Redis from Postgres.

**Locking strategy (documented):**

- **Optimistic:** `Product.version` is incremented inside the **confirm** transaction (`updateMany` with expected version) so concurrent confirms surface as `VERSION_CONFLICT`.
- **Pessimistic (pattern):** High contention on the *reserve* path is handled by Redis serialization (Lua), not by `SELECT FOR UPDATE` on every request; Postgres still holds durable state.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| GET | `/api/products` | Catalog |
| GET | `/api/products/:id/availability` | Totals and availability |
| POST | `/api/reservations` | Body: `{ productId, userLabel?, quantity? }` |
| POST | `/api/reservations/:id/confirm` | Commit purchase |
| POST | `/api/reservations/:id/cancel` | Release active hold |
| POST | `/api/demo/reset` | Reset demo data (requires `DEMO_ROUTES_ENABLED=1`) |
| POST | `/api/demo/race` | Body: `{ productId, concurrency? }` — resets DB, sets that SKU to **1** unit, fires parallel reserves |

## Tests

```bash
# Unit/domain (default)
npm test

# Postgres + Redis (requires docker stack and server/.env)
cd server && RUN_INTEGRATION=1 npm run test:integration
```

Integration suite covers: **500 concurrent reserves → exactly 1 success**, **expiry restores availability**, **confirmed reservations cannot be cancelled**.

## Stack

- Node 20+, TypeScript, Vitest  
- Prisma + PostgreSQL  
- ioredis + Lua  
- React 19, Vite 6, Tailwind 4  
