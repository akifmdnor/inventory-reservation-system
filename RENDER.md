# Deploying Inventory Reservation System on Render

Stack: **PostgreSQL**, **Redis-compatible Render Key Value**, **Node API**, **static Vite storefront**. The repo is an **npm workspaces** monorepo (`server`, `web-client`).

## One Render Web Service (API + SPA, single deploy)

| Field | Value |
|--------|--------|
| **Root Directory** | *(empty)* — monorepo root |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm run start -w server` |

In **production**, Express serves **`web-client/dist`** after `npm run build`, so UI and **`/api`** use the same host. Unset **`VITE_API_BASE`** when building so fetches use relative **`/api`**.

---

1. **New** → **Blueprint** → connect the repo whose root is **`inventory-reservation-system/`** (or set the subdirectory if the repo root is higher).
2. Render provisions **irs-postgres**, **irs-redis** (Key Value, internal-only), **irs-api**, **irs-web**.
3. Set **`VITE_API_BASE`** on **irs-web** when prompted to the public **irs-api** URL (e.g. `https://irs-api.onrender.com`), no trailing slash.
4. **Redis note:** `irs-redis` uses **`ipAllowList: []`** so only Render’s **private network** can connect. **`REDIS_URL`** on the API is wired from the Key Value instance’s **`connectionString`**. Do not paste a localhost URL in production.

### Commands (monorepo Git root)

| Phase | Command |
|--------|---------|
| Build API | `npm ci --include=dev && npm run render:build:api` |
| Migrate | `npm run render:migrate:api` |
| Start API | `npm run render:start:api` |
| Build UI | `npm ci --include=dev && npm run render:build:web` |

---

## Frontend: use a **Static Site** (recommended)

Deploy the Vite storefront as a **Static Site** (build + publish `web-client/dist`), not a Web Service.

If the UI is a **Web Service**, you will see **“Application exited early”** after a successful build: **`vite build` exits** and nothing listens on **`PORT`**. Either switch to a **Static Site**, or set **Start Command** to **`npm run render:start:web`** (repo root) or **`npm start`** (Root Directory = `web-client`). That serves **`dist`** via **`vite preview`** on **`PORT`**.

---

| Key | Notes |
|-----|--------|
| `DATABASE_URL` | From Render Postgres or external |
| `REDIS_URL` | From Render Key Value (`redis://...` on private network) or external Redis URL |
| `NODE_ENV` | `production` |
| `PORT` | Set by Render; server reads `config.port` |
| `RESERVATION_TTL_SECONDS` | Default `120`; safe to tune per environment |
| `DEMO_ROUTES_ENABLED` | Use `0` in production |

**Key expiry notifications:** Local Docker Redis enables `notify-keyspace-events` for hold TTL. On Render Key Value, confirm your plan supports the same semantics you rely on for `ReservationExpiryWorker`, or use a scheduled sweeper as a backup (see README architecture).

---

## Microservices: API only

1. **New** → **Web Service**; **Root directory** = monorepo root (`inventory-reservation-system`) or parent path as needed.
2. **Build:** `npm ci --include=dev && npm run render:build:api`  
   **Start:** `npm run render:start:api`  
   **Pre-deploy:** `npm run render:migrate:api`
3. Attach **Postgres** and **Redis** (Render Key Value or external). Set **`DATABASE_URL`** and **`REDIS_URL`**.

### API only, Root directory = `server/`

- **Build:** `npm ci --include=dev && npm run build`  
- **Start:** `npm start`  
- **Pre-deploy:** `npx prisma migrate deploy`  
- Set the same env vars as above.

If you use **external** Redis (Upstash, ElastiCache, etc.), set **`REDIS_URL`** to the vendor’s URL; Redis must be reachable from Render’s outbound network (Key Value internal URL will not apply).

---

## Microservices: Static UI only

1. **New** → **Static Site**; monorepo **root** or **`web-client`** only.
2. **Build:** `npm ci --include=dev && npm run render:build:web` (from root) **or** `npm ci --include=dev && npm run build` (from `web-client`).
3. **Publish:** `web-client/dist` or `dist`.
4. **`VITE_API_BASE`** = public API URL (`https://…`).

---

## Changing hold TTL in production

Set **`RESERVATION_TTL_SECONDS`** on the **API** service in Render (Environment). Restart/redeploy so `loadConfig()` picks it up. Existing Redis TTL keys keep their original expiry; new reserves use the new value.

---

## Troubleshooting

- **`npm ci` missing Prisma/tsc:** use `npm ci --include=dev` or `npm install` at repo root.
- **Redis connection refused:** Wrong **`REDIS_URL`**; internal Key Value URLs only work from another Render service in the same setup — not from your laptop without tunneling.
- **500 concurrent reserve test:** Run locally or in CI with Docker (`RUN_INTEGRATION=1`); not required on Render for demo.

## Git repo contains multiple projects

If this app lives under **`everest-engineering/inventory-reservation-system`** (or similar), set Render **Root Directory** to **`inventory-reservation-system`** on each service, or point the Blueprint at **`inventory-reservation-system/render.yaml`**.
