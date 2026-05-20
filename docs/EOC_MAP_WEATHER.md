# EOC map · weather · realtime evacuation

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/weather` | JWT (all desk roles + citizen + chairman) | Open-Meteo situation + PAGASA RSS + OWM tile layer URLs |
| GET | `/api/v1/weather/situation` | Same | Open-Meteo only |
| GET | `/api/v1/map/ops-live` | Ops, responder, chairman | Incidents, responders, vehicles, shelters |
| GET | `/api/v1/evacuation-centers/nearest` | Citizen | Barangay-scoped shelters |

## Environment (API)

- `OPENWEATHERMAP_API_KEY` — enables rain/cloud/temp/wind tile overlays on the unified map
- `PAGASA_RSS_URL` — default `https://www.pagasa.dost.gov.ph/rss/weather`
- `PAGASA_CACHE_TTL_SEC` — Redis/in-memory cache (default 1800s)
- `REDIS_URL` — shared cache for Open-Meteo + PAGASA

## WebSocket

When ops creates an evacuation center, the API emits **`evacuation_center_added`** (and **`evacuation_center_updated`** on patch) to all connected clients.

Frontend: `EocUnifiedMap` + `connectEocRealtime()` in `admin/src/lib/eoc-realtime.ts`.

## Dashboards

| Role | Route | Map component |
|------|-------|---------------|
| Ops | `/ops/map` | `EocUnifiedMap` mode `ops` |
| Citizen | `/citizen` (signed in) | mode `citizen` |
| Responder | `/responder/map` | mode `responder` |
| Chairman | `/chairman` | mode `chairman` |

Footer **Powered by: CoreLogic** is on the root layout (`admin/src/app/layout.tsx`).
