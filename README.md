# ICDRRMO SMART Emergency Response System

Full-stack emergency response platform for **Isabela City Disaster Risk Reduction and Management Office (ICDRRMO)**, Philippines: **Flutter** citizen app, **NestJS** API with **Socket.IO** realtime, **PostgreSQL** + **Prisma**, **Next.js** operation center with command-dashboard UI, **SMS** ingest, **Docker Compose** + **Nginx**, and **Redis** for queues and caching.

**Enterprise blueprint:** [`docs/ENTERPRISE_ECOSYSTEM.md`](docs/ENTERPRISE_ECOSYSTEM.md) — architecture, scaling, DR, integrations. **Delivery phases:** [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md).

## Repository layout

| Path | Role |
|------|------|
| `backend/` | NestJS REST + Socket.IO (`/realtime` namespace), JWT + refresh sessions, SOS + SMS ingest, Prisma schema + migrations |
| `admin/` | Next.js 15 Operation Center — secure login, live incident queue, situation map panel, Socket.IO event stream |
| `mobile/` | Flutter citizen app — SOS, offline queue stack (Riverpod, Dio, Hive, GPS, SMS packages) |
| `infra/nginx.conf` | Reverse proxy: `/api/*` → API, `/socket.io/*` → API, `/` → admin |
| `docker-compose.yml` | Postgres, Redis, API, admin, Nginx |

## Windows + Prisma (read this)

- **Paths with spaces:** use quotes: `cd "D:\CoreLogic Files\ICDRRMO"` then `cd backend` (or stay at root and use `npm run …` below).
- **Do not run `npx prisma` at the repo root** unless you pass `--schema` — the schema and seed live under **`backend/`**. Root scripts call **`npm --prefix backend exec -- prisma …`** so the correct Prisma + `package.json` seed are used.

## Workspace npm scripts (repo root)

| Script | What it does |
|--------|----------------|
| `npm run build` | Nest `dist/` + Next `.next/` (not Firebase export) |
| `npm run start:prod` | Run **API only** (`node backend/dist/main.js`) — run `npm run build` first |
| `npm run start:admin` | Next production server on :3000 (needs `npm run build:admin` first) |
| `npm run dev:api` / `npm run dev:admin` | Local dev servers |
| `npm run prisma:generate` | `prisma generate` using **backend** schema + CLI |
| `npm run seed` / `npm run db:seed` | Prisma seed — same as `backend`’s `prisma db seed` (uses **`tsx prisma/seed.ts`** there) |

## Quick start (Docker — production-like)

1. Root: copy `.env.example` → `.env` (JWT etc.). Backend: copy `backend/.env.example` → `backend/.env` (Compose Postgres URL: `postgresql://icdrrmo:icdrrmo@localhost:5432/icdrrmo?schema=public`).
2. `docker compose up --build -d`
3. One-time ops account: **`npm run docker:seed`** (or `docker compose exec api npx prisma db seed`)  
   Login: **ops.admin@icdrrmo.local** / **ChangeMe!OpsAdmin12** (override with `SEED_ADMIN_*` on seed).
4. Open **http://localhost** (Nginx → admin + `/api/` + Socket.IO). Or **http://localhost:3000** (direct admin; REST `/api/v1` and `/socket.io` are proxied to the API).

Default ports: Nginx **:80**, API **:4000**, admin **:3000**, Postgres **:5432**, Redis **:6379**.

## Local dev from your machine (no full stack Docker)

From repo root: **`npm run db:setup`** brings up Postgres + Redis, runs migrations + seed (**requires Docker**). Then **`cd backend && npm run start:dev`** and **`cd admin && npm run dev`**. Gateway: http://localhost:3000 (`/` → Citizen vs Ops links). Ops console: http://localhost:3000/ops (`/dashboard` redirects there). Citizen web: `/citizen`. Nest on :4000; Next rewrites forward `/api/v1` and `/socket.io`.

### Docker troubleshooting (Prisma P3009 / P3018)

If the API container exits on `prisma migrate deploy` with **P3009** (“failed migrations in the target database”), Postgres still has a **stuck row** in `_prisma_migrations` from an earlier failed apply (for example the UTF-8 BOM issue on `00000000000000_init`).

**Local dev (simplest — wipes DB + Redis data):**

```powershell
docker compose down -v
docker compose up --build
```

Then seed again: `docker compose exec api npx prisma db seed`.

**Keep data but clear failed migration record** (only if you know no tables were created from that run — true for a BOM failure at line 1):

```powershell
docker compose run --rm --entrypoint sh api -c "npx prisma migrate resolve --rolled-back 00000000000000_init && npx prisma migrate deploy"
docker compose up -d
```

Or use the helper script: `.\scripts\reset-docker-dev.ps1`.

**API exits with `Cannot find module '/app/dist/main.js'`:** often a stale **`*.tsbuildinfo`** on the host was copied into the image so `nest build` emitted no JS. The repo `.dockerignore` now excludes those files; rebuild with `docker compose build api --no-cache`. Locally, delete `backend/*.tsbuildinfo` and run `npm run build` again.

**API crashes right after routes (`compression` / Prisma engine):** fixed in repo via **`esModuleInterop`** in `tsconfig.json`, **`binaryTargets`** for OpenSSL 3 in `prisma/schema.prisma`, and OpenSSL in the Docker **build** stage. Rebuild the `api` image after pulling changes.

## REST API

Base URL: `/api/v1` (behind Nginx: `http://localhost/api/v1`).

| Method | Path | Auth | Purpose |
|--------|------|------|----------|
| POST | `/auth/register` | — | Citizen registration |
| POST | `/auth/login` | — | Login; returns `accessToken`, `refreshToken` |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/incidents/sos` | JWT | One-tap SOS from mobile app |
| GET | `/incidents/queue` | JWT + ops role | Open incident queue |
| POST | `/sms/inbound` | `X-ICDRRMO-Signature` | GSM/Android relay → create incident from SMS |
| GET | `/weather/alerts` | — | Service endpoint until PAGASA / PHIVOLCS ingest workers are enabled |
| GET | `/health` | — | Liveness |

### SMS relay signature

Gateway computes `sha256(UTF8(\`${SMS_WEBHOOK_SECRET}:${from}|${body}\`))` and sends header `X-ICDRRMO-Signature` with that hex. Body format:

`SOS|USER_ID|LATITUDE|LONGITUDE|TYPE|BATTERY`

## WebSocket (Socket.IO)

- URL: same host as API, path `/socket.io`, namespace **`/realtime`**.
- Client `auth: { token: "<access JWT>" }` (optional `Bearer ` prefix stripped server-side).
- Server rooms: `ops` (admin/operator), `user:{userId}`, `responders`.
- Events: `incident_created`, `incident_updated`, `responder_location_updated`, `user_location_updated`, `weather_alert`, `emergency_notification`, `incident_closed` (emitters on gateway; extend as dispatch and weather modules grow).

## Local dev (without Docker for API)

```bash
cd backend
cp .env.example .env   # set DATABASE_URL to local Postgres
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

Admin (talk to API on 4000):

```bash
cd admin
echo NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api/v1 > .env.local
echo NEXT_PUBLIC_WS_URL=http://127.0.0.1:4000 >> .env.local
npm install
npm run dev
```

## Security checklist (production hardening)

- [ ] Replace all default secrets; store in vault / KMS.
- [ ] TLS everywhere (terminate at Nginx or cloud LB); redirect HTTP→HTTPS.
- [ ] Enable structured audit logging to SIEM; retain `audit_logs` + request IP.
- [ ] Add Helmet CSP tuned for admin + mobile deep links.
- [ ] File uploads: antivirus scan, MIME sniffing, signed URLs (S3-compatible), size caps.
- [ ] Fake SOS: device attestation (where feasible), CAPTCHA on register, anomaly scoring, responder callback.
- [ ] Rate limits per IP + per user (Throttler is global; add Redis storage for multi-instance).
- [ ] Prisma prevents SQL injection; keep raw SQL rare and parameterized.

## Backup & DR (outline)

- **Postgres**: nightly `pg_dump` / managed automated backups; test restores quarterly.
- **Redis**: AOF already in Compose; treat as cache — rebuild from DB if lost.
- **Object storage** (media): versioning + cross-region replication.

## Monitoring

- Prometheus + Grafana (API latency, WS connections, queue depth).
- Sentry (API + admin + Flutter).
- Uptime checks on `/api/v1/health` and Nginx.

## Scalability (summary)

- Stateless API + horizontal replicas behind Nginx; sticky sessions **not** required for REST; Socket.IO needs Redis adapter for multi-node.
- BullMQ on Redis for SMS retry, outbound notifications, weather polling.
- Read replicas for analytics; partition `user_locations` / `responder_locations` by time when volume grows.

## Step-by-step implementation guide

1. **Infra:** finalize TLS certs on Nginx; lock down Compose networks; add secrets manager.
2. **Database:** run migrations in CI; add seed data for barangays + evacuation polygons (GeoJSON).
3. **API:** extend `users` profile PATCH, file upload to object storage, `audit_logs` on sensitive mutations.
4. **Realtime:** add Redis Socket.IO adapter; emit remaining events from dispatch + weather workers.
5. **SMS:** deploy Android gateway APK or GSM modem bridge; implement signing + idempotency in relay.
6. **Admin:** wire Mapbox layers, heatmap, audio alerts, responder panel, audit log viewer to existing navigation shell.
7. **Mobile:** onboarding + GPS gate, background tracking service, Hive queue, SMS composer, FCM.
8. **Responder:** second Flutter flavor or role-gated routes; vehicle + status sync.
9. **Queues:** BullMQ workers (SMS retry, notifications, weather); DLQ dashboards.
10. **Ops:** runbooks, load test (thousands of WS clients), tabletop disaster exercise.

## Render (Docker API)

See **`docs/RENDER_DEPLOY.md`** — correct **Pre-Deploy** (not a folder path), **Root Directory / Dockerfile** combinations, and env vars (`DATABASE_URL`, optional `REDIS_URL`, `CORS_ORIGINS`).

## Firebase / Firestore

Rules, indexes, and seed data live in **`infra/firebase/`**. Root **`firebase.json`** sets Hosting **`public`** to **`admin/out`** (the static Next export). Do **not** keep a root **`public/index.html`** from `firebase init` — that template is what `*.web.app` shows if it gets deployed instead of **`admin/out`**.

**Ship the Operation Center to Hosting:** from repo root, `firebase login` once, add **`admin/.env.deploy`** from **`admin/.env.deploy.example`** (absolute `NEXT_PUBLIC_*` URLs), then **`npm run deploy:hosting`**. That file overrides dev `.env.local` during export so `/api/v1` is not baked into the Firebase bundle. CI on **`main`** sets the same variables from GitHub secrets instead.

Set repo secrets **`FIREBASE_SERVICE_ACCOUNT_ICDRRMO_B204E`** (JSON), **`NEXT_PUBLIC_API_URL`**, and **`NEXT_PUBLIC_WS_URL`**. For the Render service **`icdrrmo-api`**, use exactly:

- **`NEXT_PUBLIC_API_URL`** = `https://icdrrmo-api.onrender.com/api/v1`
- **`NEXT_PUBLIC_WS_URL`** = `https://icdrrmo-api.onrender.com`

Do **not** use `icdrrmo-app-1.onrender.com` (that is a different Render hostname); the Hosting workflow will **fail the build** if those secrets still contain `icdrrmo-app-1`. Values are baked at **build** time — after changing secrets, run the workflow again (push to `main` or **Actions → re-run**).

Put your Firebase admin origins in **`CORS_ORIGINS`** on the API (e.g. `https://icdrrmo-b204e.web.app`, `https://icdrrmo-b204e.firebaseapp.com`, plus any preview `*.web.app` URLs you use). Firestore: `npm run firebase:deploy-firestore`; seed: `npm run firebase:seed` with **`GOOGLE_APPLICATION_CREDENTIALS`**. Project: **`.firebaserc`** (`icdrrmo-b204e`).

## Documentation

See **`docs/ARCHITECTURE.md`** for system diagrams, flows (SOS, SMS, offline sync), rollout roadmap, and module-by-module implementation order.

## License

Proprietary — Isabela City ICDRRMO unless otherwise agreed.
