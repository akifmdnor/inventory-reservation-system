# Inventory Reservation System

## Everest coding challenge brief — Q&A (quiz)

The PDF *Inventory Reservation System Everest Coding challenge* is a scenario overview, not a multiple-choice sheet. Below are the answers you would give if quizzed on that brief.

**Why does this system matter in the real world?**  
Flash sales drive extreme traffic. For **limited stock** products, **many users click “Buy” at the same time**. Without proper design, the system can **oversell** (sell more units than exist).

**What is the core problem (in four ideas)?**  
1) Only **one** unit left in stock. 2) **Many** simultaneous requests (e.g. 500 users). 3) **Without** concurrency control, several requests can each think they reserved the item. 4) **Result:** overselling.

**What are the four challenge objectives?**  
**01** Prevent overselling. **02** Handle concurrent requests correctly. **03** Manage **temporary** reservations (holds). **04** Keep inventory state **consistent** end-to-end.

**How does “inventory reservation” work in one line?**  
A user **reserves** an item (inventory is **locked** for them), then **confirms** or **cancels**; if neither happens in time, the hold **auto-releases** on expiry.

**What hold duration does the brief specify?**  
**2 minutes.** After that, expired reservations should **automatically** release inventory back.

**What is the availability / available-stock formula in the brief?**  
**Available stock = Total stock − Confirmed sales − Active reservations.**

**What must happen if a reservation would exceed available stock?**  
The request must **fail** (reject the reservation).

**Can a confirmed purchase be undone in the rules?**  
**No.** Confirmed purchases **cannot** be reversed.

**How many users can reserve the last remaining unit?**  
**Only one** user should successfully reserve that last item; competing attempts should fail.

**What should happen when a reservation expires?**  
Inventory is **released automatically** (the hold is no longer counted against availability).

**What does Level 1 require?**  
Basic reservation: keep inventory **in memory**, implement **reserve**, and **reject** when stock is unavailable.

**What does Level 2 add (lifecycle)?**  
States such as **Active**, **Confirmed**, **Cancelled**, and **Expired**; **hold for 2 minutes**; **Confirm** means purchase completed; **Cancel** or **expiry** releases inventory. Example: stock = 1 → User A succeeds, User B fails.

**What is Level 3 about?**  
**Concurrency handling** so **race conditions** don’t break the rules. Example techniques named in the brief: **mutex/locks**, **atomic operations**, **thread-safe structures** (in a distributed service this is often expressed as atomic counters, single-threaded Lua, DB constraints, etc.).

**What is the Level 3 test scenario and expected outcome?**  
**Stock = 1**, **500** simultaneous reservation attempts → **exactly 1** success and **499** failures.

**How should you test and what will evaluators look for?**  
**Tests:** unit tests for reservation logic; **concurrency** tests with **parallel** requests. **Evaluation:** correctness, concurrency handling, **expiry** logic, code quality, and a **clear explanation of your locking / concurrency strategy**. Estimated time on the brief: **2–3 hours**.

---

Local-first inventory and reservations with **PostgreSQL** (source of truth), **Redis** (Lua atomic guard and TTL holds), **Express + TypeScript**, and a **premium ecommerce** React (Vite + Tailwind) UI.

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

## Proposed AWS cloud architecture

Reference diagram (illustrative — tune VPC, subnets, and security groups for production):

![Proposed AWS deployment](docs/aws-proposed-architecture.png)

You can also render or export the same topology from the Mermaid source below (e.g. [mermaid.live](https://mermaid.live) → PNG/SVG).

```mermaid
flowchart TB
  subgraph users[Users]
    B[Browser]
  end

  subgraph edge[Edge]
    CF[CloudFront]
  end

  subgraph static[Static site]
    S3[S3 bucket\nReact / Vite build]
  end

  subgraph compute[API tier]
    ALB[Application Load Balancer]
    EB[Elastic Beanstalk\nNode / Express API]
  end

  subgraph data[Data tier]
    RDS[(Amazon RDS\nPostgreSQL)]
    EC[ElastiCache\nRedis cluster]
  end

  subgraph serverless[Optional automation]
    EV[Amazon EventBridge]
    FN[AWS Lambda\nworkers / schedules]
  end

  subgraph obs[Monitoring]
    CW[Amazon CloudWatch]
    XR[AWS X-Ray]
  end

  B --> CF
  CF --> S3
  CF --> ALB
  ALB --> EB
  EB --> RDS
  EB --> EC
  EV -.-> FN
  FN -.-> EB
  EB --> CW
  RDS --> CW
  EC --> CW
  EB --> XR
```

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
