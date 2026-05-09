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

## `prisma dev` / ephemeral ports (`51213`, `51214`)

URLs like `localhost:51214` come from **Prisma dev** tunnels. If that process stops, you get **P1001**. Point `DATABASE_URL` at a stable Postgres (Docker `:5432` or your cloud host) instead.
