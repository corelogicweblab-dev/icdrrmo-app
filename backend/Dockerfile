# ICDRRMO API — production multi-stage build
#
# Docker build CONTEXT must be the `backend/` folder (same as Compose: `build.context: ./backend`).
# On Render: set Root Directory = `backend`, Dockerfile Path = `Dockerfile` — NOT repo root + `-f backend/Dockerfile`
# with default context, or `COPY` will pull the wrong package.json and `npm run build` / Prisma will fail.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Never trust a copied incremental cache from the host (can yield zero JS output)
RUN rm -f tsconfig.build.tsbuildinfo tsconfig.tsbuildinfo
RUN npm run build
RUN test -f dist/main.js

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Important: bring over node_modules and dist from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
EXPOSE 4000
# Seed is idempotent (barangays + accounts; passwords unchanged unless FORCE_SEED_PASSWORDS=1).
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
