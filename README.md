# Inventory Reservation System

## Data model (PostgreSQL)

Core tables from `server/prisma/schema.prisma` (durable state; Redis holds hot counters and TTL keys):

![Entity relationship diagram — Product, Reservation, InventoryLedger](docs/db-erd.png)

## Proposed AWS cloud architecture

Reference diagram (illustrative — tune VPC, subnets, and security groups for production):

![Proposed AWS deployment](docs/aws-proposed-architecture.png)

### Components

| Piece | AWS service | Role |
|--------|-------------|------|
| **Web client** | **S3** (+ **CloudFront**) | Host the built SPA (`npm run build` in `web-client`). Set cache policies for `index.html` (short TTL) vs hashed assets (long TTL). Point **`VITE_API_BASE`** at the public API URL (Beanstalk/ALB). |
| **API** | **Elastic Beanstalk** | Run the Express server (Docker or Node platform). Place behind **ALB** (included in typical EB web tier). Configure **security groups** so only the EB tier talks to RDS and ElastiCache. |
| **PostgreSQL** | **Amazon RDS** | Durable catalog, reservations, ledger; same Prisma schema/migrations as local. Use Multi-AZ for production. |
| **Redis** | **Amazon ElastiCache for Redis** | Lua atomic holds + TTL; enable **keyspace notifications** if your app relies on expiry events (align with ElastiCache parameter group). |
| **Functions (optional)** | **AWS Lambda** + **EventBridge** | Not a replacement for Redis: use for **scheduled** tasks (reconciliation, reports), **async** fan-out, or integrations. If you avoid in-process Redis expiry listeners, you could invoke Lambda on a schedule to sweep expiring holds (app-specific). |

### Monitoring and operations

- **Amazon CloudWatch** — Log groups for **Beanstalk** instances (API logs), **RDS** slow query / performance, **ElastiCache** engine metrics; dashboards for CPU, memory, connections, error rate.
- **CloudWatch alarms + SNS** — Alert on API 5xx rate, ALB unhealthy targets, RDS free storage, Redis evictions / high CPU, breach of concurrency.
- **AWS X-Ray** — Enable on the **Beanstalk** environment for distributed traces across external calls (RDS/Redis), to debug latency under flash-sale load.
- **CloudWatch Synthetics** — **Canaries** that hit `/api/health` and a lightweight `GET /api/products` from multiple regions.
- **Optional:** **RDS Performance Insights**, **ElastiCache** metrics (connections, CPU, evictions), and a runbook for scaling EB capacity / Redis node type during events.

---

Local-first inventory and reservations with **PostgreSQL** (source of truth), **Redis** (Lua atomic guard and TTL holds), **Express + TypeScript**, and a **premium ecommerce** React (Vite + Tailwind) UI.

## Design decisions

- **PostgreSQL plus Redis, not one or the other** — The catalog, reservation rows, and inventory ledger stay in Postgres so you get durable constraints, auditability, and straightforward reporting. Redis owns the hot path: a Lua script performs compare-and-decrement with a TTL hold in one round trip, which serializes flash-sale contention without leaning on row locks for every browser. After mutations (or on startup), counters are reconciled so Redis and the DB-backed availability formula stay aligned.
- **Optimistic versioning on confirm** — Conflicts on `Product.version` surface as explicit failures instead of silent last-write wins; reserves stay fast on Redis, while the money-moving confirm path remains safe in a transaction.
- **Timeouts, retries, and idempotency (conceptual)** — Clients should treat **reserve** as a command that can time out while the server still applied it: retries use the same logical reservation id (or a dedupe key) where the API allows it so a duplicate attempt does not create a second hold. Confirm and cancel should be safe to retry when the server exposes stable ids and returns the same outcome for duplicates; the combination of Redis hold keys and Postgres state machine makes "exactly-once" user-visible effects easier to reason about than at-least-once alone.
- **Expiry as a first-class transition** — Holds expire via TTL; the app transitions reservations to `EXPIRED`, writes ledger rows, and reconciles stock so inventory cannot leak when clients abandon checkout.

**Deploy on Render (Postgres + Redis + API + static UI, or split services):** see **[RENDER.md](RENDER.md)** and root **`render.yaml`**.

## Quick start

```bash
cd inventory-reservation-system
npm install
```

Create `server/.env` (local values):

```env
DATABASE_URL="postgresql://inventory:inventory@localhost:5434/inventory_reservation?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3002
NODE_ENV=development
RESERVATION_TTL_SECONDS=120
DEMO_ROUTES_ENABLED=1
```

```bash
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
