# ICDRRMO Smart Command Center

Enterprise disaster risk management desk for Isabela City DRRMO — maps product requirements to shipped modules.

## Authentication & roles

| Role | Access |
|------|--------|
| **SUPER_ADMIN / ADMIN** | Full EOC: all barangays, users, system health |
| **OPERATOR** | Barangay-scoped dispatcher desk |
| **AUDITOR** | Read-only command center + audit logs (COA/DILG/DPA) |
| **RESPONDER / CITIZEN / CHAIRMAN** | Separate portals (mobile + web handoff) |

- **Multi-tenancy:** `Barangay` is the tenant boundary; operators see only their barangay; admins see unified city platform.
- **SSO / federation:** Configure `OIDC_ISSUER_URL` on the API for LGU identity federation (hook point; local JWT remains default).
- **Sessions:** JWT access tokens today; `Session` table reserved for refresh rotation.

## Core dashboard modules

| Module | Route | API |
|--------|-------|-----|
| Smart command center | `/ops` | `GET /command-center/snapshot` |
| Live incidents | `/ops/incidents` | `GET /incidents/queue`, Socket.IO |
| Incident timeline | Incidents detail | `GET /incidents/:id/timeline` |
| Resource tracker | Command center + `/ops/vehicles` | Vehicles/responders in snapshot |
| Realtime map | `/ops/map` | `GET /map/ops-live`, Leaflet + Mapbox |
| Evacuation centers | `/ops/evacuation` | CRUD + capacity alerts in snapshot |
| Hazard mapping | `/ops/barangays`, weather desk | Barangay flags + Open-Meteo |

## Smart intelligence (current)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Predictive risk matrix | **Live (rules)** | Weather + barangay hazard flags → score 0–100 |
| Auto-dispatch suggestions | **Live** | `GET /command-center/dispatch/suggestions` (Haversine + ETA) |
| Incident heatmap | **Partial** | Mapbox layers + snapshot `heatmapPoints` |
| NLP SMS classify | **Live (keywords)** | `POST /command-center/nlp/classify` |
| TensorFlow / PyTorch models | **Planned** | Replace rules layer via feature store |

## Communications & compliance

- **FCM:** Firebase push (chairman alarms, hazard broadcasts, weather digest).
- **SMS:** Inbound webhook → incidents; outbound queue (worker stub).
- **Audit:** `AuditLog` + `GET /audit-logs` wired to `/ops/audit`.
- **Incident logs:** Append-only `incident_logs` exposed on timeline API.

## Infrastructure

| Layer | Current | Target |
|-------|---------|--------|
| API | NestJS + Prisma + Postgres on Render | Same |
| Admin | Next.js static export → Firebase Hosting | Same |
| Local stack | `docker-compose.yml` | Dev/prod parity |
| Scale-out | — | `infra/k8s/` manifests (skeleton) |
| DR / encryption | TLS at edge; bcrypt passwords | K8s secrets, DB encryption at rest (cloud) |

## Priority UI coding

- **Critical:** red + `animate-alert-blink`
- **High / moderate:** orange panels
- **Routine:** zinc/orange-muted

Footer: **Powered by: CoreLogic** (global layout).

## Demo accounts

See `README.md` and `backend/prisma/seed.ts`. Add auditor user after migration:

- Email: `auditor@icdrrmo.local` (seed if added)
