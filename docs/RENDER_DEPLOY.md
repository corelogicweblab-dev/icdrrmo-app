# Deploy ICDRRMO API on Render (Docker)

## Prisma schema

The Prisma schema is **`backend/prisma/schema.prisma`**. It already exists — do not replace it with a minimal model file.

## Fix the dashboard mistakes (from your screenshot)

### 1. Pre-Deploy Command

**Wrong:** `backend/` (that is a path, not a command — deploy can fail or do nothing useful.)

Use **one** of these:

| Choice | Pre-Deploy Command | Start / Docker CMD |
|--------|--------------------|----------------------|
| **A (simplest)** | *(leave empty)* | Keep default from `backend/Dockerfile` (`migrate deploy` then `node dist/main.js`) |
| **B** | `npx prisma migrate deploy` | In Render **Docker Command**, set `node dist/main.js` only if you want migrations **only** at pre-deploy (avoids running migrate on every cold start) |

After saving, trigger a **manual deploy**.

### 2. Root Directory + Dockerfile (fixes **“Exited with status 1 while building”**)

The `backend/Dockerfile` does `COPY package.json` then `nest build`. Those files must come from **`backend/`**, not the monorepo root.

**Use this on Render (recommended):**

| Field | Value |
|--------|--------|
| **Root Directory** | `backend` |
| **Dockerfile Path** | `Dockerfile` |
| **Docker Build Context Directory** | *(leave default / same as root dir)* |

**Wrong (common):** Root Directory **empty**, Dockerfile **`backend/Dockerfile`**, but build context still **repo root** → Docker copies the **root** `package.json` (workspace scripts only) → `npm ci` / `nest build` / Prisma fail → **build exits with status 1**.

If you must keep Root Directory empty, set **Docker Build Context Directory** explicitly to **`backend`** (same as `docker compose` which uses `context: ./backend`).

Do **not** combine **Root Directory = `backend`** with **Dockerfile Path = `backend/Dockerfile`** — that points at `backend/backend/Dockerfile` and fails.

### 3. Environment variables (minimum)

| Key | Notes |
|-----|--------|
| `DATABASE_URL` | Render Postgres **External** URL, `postgresql://…`, includes DB name and `?sslmode=require` if your host requires TLS |
| `JWT_ACCESS_SECRET` | Long random string (32+ bytes). The API does **not** read `JWT_SECRET` — remove that variable on Render if you added it, to avoid confusion. |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | Comma-separated origins, **no spaces** (e.g. `https://icdrrmo-b204e.web.app,https://icdrrmo-b204e.firebaseapp.com`). Add Firebase **preview** URLs if you use PR channels, e.g. `https://icdrrmo-b204e--pr-12.web.app`. |
| `REDIS_URL` | **Unset** if you have no Redis on Render (avoids `ECONNREFUSED 127.0.0.1:6379`). Optional: use Render Redis / Upstash URL |

### 4. One-time seed (ops admin)

After the first successful deploy and migrations:

```bash
# From your machine, with DATABASE_URL pointing at the same Render DB:
cd backend
npx prisma db seed
```

Or from repo root: `npm run seed` (with `DATABASE_URL` exported for that shell).

### 5. Health check

Use **`/api/v1/health/ready`** (or `/api/v1/health` if you only expose liveness) as the Render health check path.

## Troubleshooting: “Exited with status 1 while building”

1. Open the **full** build log (scroll past “Downloaded cache” / “Cloning”) and find the first `npm` / `nest` / `prisma` / `COPY` error line.
2. If you see wrong paths (e.g. missing `nest`, wrong `package.json`, or Prisma “could not find schema”), fix **Root Directory** and **build context** per **section 2** above, then redeploy.
3. Confirm **Pre-Deploy** is not a bare path like `backend/` — use empty or `npx prisma migrate deploy` only (**section 1**).
