# ICDRRMO SMART Emergency Response — Deliverables Map

NestJS API (`backend/`) + Next.js static admin (`admin/`) for Isabela City unified disaster operations.

**Live (production):**

- Web: Firebase Hosting → `admin/out` (`firebase.json`)
- API: Render Docker service → `backend/` (`render.yaml`)
- DB: Render Postgres + Prisma (`backend/prisma/schema.prisma`)

---

## 1. Authentication

| Requirement | Implementation |
|-------------|----------------|
| JWT access only (no refresh) | `POST /api/v1/auth/login`, `auth/auth.service.ts` — `{ accessToken }`, `JWT_ACCESS_SECRET` |
| Role-based login | `UserRole`: CITIZEN, RESPONDER, OPERATOR, BARANGAY_CHAIRMAN, ADMIN, SUPER_ADMIN, AUDITOR |
| Auto-route to dashboard | `admin/src/lib/unified-auth.ts` → `/citizen`, `/responder`, `/chairman`, `/ops` |
| RBAC | `@Roles()` + `RolesGuard` on controllers; barangay scope for OPERATOR |

---

## 2. Citizen dashboard

| Requirement | Path |
|-------------|------|
| Registration + profile (barangay, street, GPS) | `/citizen`, `POST /auth/register`, `PATCH /users/me` |
| Incident types (Medical, Fire, Flood, Typhoon, Crime, Other) | `smart-citizen-dashboard.tsx` → `POST /incidents/sos` |
| SOS button | Same endpoint with GPS |
| Agency routing | `incident-routing.ts` — Fire→BFP, Crime→PNP, Medical→ICDRRMO medical, Flood/Typhoon→ICDRRMO ops |
| Citizen confirmation SMS / push / email | `incident-notifications.service.ts` on create |

---

## 3. Responder dashboard

| Requirement | Path |
|-------------|------|
| Sign-in | Unified `/` or responder token storage |
| Assignments + incident details | `/responder` → `GET /responders/me/field-dashboard` |
| GIS map + directions | `/responder/map`, route URLs in field dashboard |
| Profile | `/responder/profile` |

---

## 4. Operator / EOC dashboard

| Requirement | Path |
|-------------|------|
| Incident queue + filters | `/ops/incidents`, `GET /incidents/queue` |
| Situation map (responders, vehicles, evac) | `/ops/map`, `GET /map/ops-live` |
| Realtime sync | Socket.IO `/realtime` + optional `REDIS_URL` adapter |
| Audit logs | `/ops/audit`, `GET /audit-logs` |
| Operator reroute | `PATCH /incidents/:id` `{ routedAgency }` — audited `agency_reroute` |
| Role assignment (Chairman / Responder) | `/ops/users` — OPERATOR-scoped PATCH |

---

## 5. Chairman dashboard

| Requirement | Path |
|-------------|------|
| Privileged barangay view | `/chairman` |
| Analytics / KPIs | `GET /chairman/executive-overview`, `ChairmanExecutivePanel` |
| RBAC | `BARANGAY_CHAIRMAN` + barangay scope |

---

## 6. Notifications

| Channel | Implementation |
|---------|----------------|
| SMS (Infobip) | `INFOBIP_API_KEY` → `communications/sms-sender.ts`; Bull `sms-retry` worker |
| SMS (fallback gateway) | `SMS_GATEWAY_URL` |
| Push | Firebase FCM — `push/push.service.ts` |
| Email | SMTP — `alerts/alerts.service.ts`, incident + agency alerts |
| Agency auto-alerts | `AGENCY_BFP_*`, `AGENCY_PNP_*`, `AGENCY_ICDRRMO_*` env lists |

---

## 7. Deployment

| Variable | Use |
|----------|-----|
| `GEMINI_API_KEY` / `GEMINI_MODEL` | ICDRRMO AI assistant |
| `WINDY_API_KEY` | Weather map tiles |
| `REDIS_URL` | BullMQ + Socket.IO Redis adapter |
| `DATABASE_URL` | Prisma — run `npx prisma migrate deploy` from `backend/` |
| `JWT_ACCESS_SECRET` | Auth |
| `INFOBIP_*` | SMS |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | FCM + Firestore mirror |

**Commands:**

```bash
cd backend && npx prisma migrate deploy
cd admin && npm run build   # exports to admin/out
firebase deploy --only hosting
```

---

## 8. Core API surface (Nest, prefix `/api/v1`)

| Area | Controller |
|------|------------|
| Auth | `auth/auth.controller.ts` |
| Incidents | `incidents/incidents.controller.ts` |
| Notifications | `notifications/notifications.controller.ts` |
| Users | `users/users.controller.ts` |
| Audit | `audit-logs/audit-logs.controller.ts` |
| Chairman | `chairman/chairman.controller.ts` |
| Realtime | `realtime/realtime.gateway.ts` |

---

## Repository layout

```
ICDRRMO/
├── backend/          NestJS + Prisma + workers
├── admin/            Next.js 15 (static export)
├── firebase.json     Hosting → admin/out
├── render.yaml       API + Postgres blueprint
└── DELIVERABLES.md   This file
```
