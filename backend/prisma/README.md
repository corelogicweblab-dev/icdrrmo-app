# Prisma — ICDRRMO backend

## Default: Docker / local Postgres

`schema.prisma` uses a single **`DATABASE_URL`** (plain `postgresql://…`).

1. Start Postgres (e.g. `docker compose up -d postgres` from repo root).
2. In `backend/.env`, set:
   `DATABASE_URL="postgresql://icdrrmo:icdrrmo@localhost:5432/icdrrmo?schema=public"`
3. From `backend/`:
   `npx prisma migrate deploy`

## Prisma CLI paths

Run commands from **`backend/`** (where `prisma/schema.prisma` lives):

```powershell
cd "D:\CoreLogic Files\ICDRRMO\backend"
npx prisma migrate deploy
```

If you pass `--schema`, it must be relative to the current directory, e.g. `--schema=./prisma/schema.prisma` — not `./backend/prisma/...` when you are already inside `backend`.

## Prisma Accelerate (`prisma+postgres://…`)

`migrate deploy` needs a **direct** TCP connection to PostgreSQL (not only the Accelerated URL).

- **Recommended:** Keep `DATABASE_URL` in `.env` as **`postgresql://…`** for migrations and local API development.
- If the **app runtime** must use Accelerate, use a separate env file or deployment env var for production builds; for migrations in CI/CD, run `migrate deploy` with `DATABASE_URL` set to the direct Postgres URL for that step.

Example (PowerShell, one-shot migrate):

```powershell
$env:DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/icdrrmo?schema=public'
npx prisma migrate deploy
```

## Render / single Web Service

**Dashboard checklist:** `docs/RENDER_DEPLOY.md` (Pre-Deploy must be a shell command or empty — not `backend/`).

- **Schema file:** `backend/prisma/schema.prisma` already exists (full ICDRRMO models). Do **not** replace it with a toy `User`-only schema.
- **`DATABASE_URL`:** set in the Render dashboard to your **managed Postgres** URL (must reach Postgres from Render’s network). Migrations: same URL, direct `postgresql://…` (not `prisma+…` only) for `migrate deploy`.
- **`REDIS_URL`:** optional. If you have no Redis on Render, **unset** `REDIS_URL` — the API uses the default Socket.IO adapter and skips BullMQ queues (see `JobsService`). Setting `redis://127.0.0.1:6379` on Render **will** fail.
- **Prisma from your laptop against Render DB (PowerShell):**  
  `cd "…\backend"` then  
  `$env:DATABASE_URL='postgresql://…'; npx prisma migrate deploy`  
  `$env:DATABASE_URL='postgresql://…'; npx prisma db seed`

## `prisma dev` / ephemeral ports (`51213`, `51214`)

URLs like `localhost:51214` come from **Prisma dev** tunnels. If that process stops, you get **P1001**. Point `DATABASE_URL` at a stable Postgres (Docker `:5432` or your cloud host) instead.
