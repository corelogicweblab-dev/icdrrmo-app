# SMART Citizen Dashboard

Enterprise citizen experience on `/citizen` (Next.js PWA) backed by NestJS `CitizenDashboardModule`.

## API (`/api/v1/citizen`)

| Endpoint | Description |
|----------|-------------|
| `GET /citizen/feed` | Unified feed: GeoJSON (GDACS + PAGASA + Windy tiles), evac centers, community, heatmaps, AI risk, system health |
| `GET /citizen/feed/geojson` | Hazard GeoJSON + heatmap layers only |
| `GET /citizen/incidents/mine` | Reporter incidents with lifecycle (`reported` → `verified` → `responded` → `resolved`) |
| `GET /citizen/incidents/:id/timeline` | SOS lifecycle steps (citizen-owned only) |
| `GET /citizen/community` | Barangay / volunteer / donation posts |
| `GET/PATCH /citizen/preparedness` | Emergency kit checklist + badges |
| `GET /citizen/medical` | Blood type, allergies, emergency contacts |
| `GET/POST/DELETE /citizen/emergency-contacts` | Emergency contact CRUD |
| `GET /citizen/system-health` | System Online badge data |

## Realtime (Socket.IO `/realtime`)

- `citizen_feed_updated` — refresh feed after preparedness or incident updates
- `incident_created` / `incident_updated` — SOS lifecycle

## Env

- `WINDY_API_KEY` — Windy tile layers (wind, temp, rain, satellite)
- `REDIS_URL` — shared cache for weather GeoJSON + citizen feed
- `CITIZEN_FEED_CACHE_TTL_SEC` — feed cache TTL (default 90)

## CI/CD

- **Render:** `.github/workflows/render-api-deploy.yml` (set `RENDER_DEPLOY_HOOK_URL`)
- **Firebase Hosting:** existing `firebase-hosting-merge.yml` for admin static export

## Database

Migration `20260521020000_citizen_smart_dashboard`: `community_posts`, `citizen_preparedness`.
