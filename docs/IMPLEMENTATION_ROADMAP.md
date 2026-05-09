# Implementation roadmap — ICDRRMO enterprise ecosystem

Phased plan to reach full operational parity with the enterprise specification. Each phase assumes the previous is stable in staging.

---

## Phase 0 — Foundation (done / continuous)

- [x] NestJS API modular monolith, Prisma, PostgreSQL schema core
- [x] JWT + refresh + RBAC + audit/session tables
- [x] Socket.IO realtime gateway + ops rooms
- [x] Redis-backed Socket.IO adapter (horizontal scale)
- [x] BullMQ queue registration (`JobsService`) — workers next
- [x] SMS webhook + parser + dedupe
- [x] Next.js Operation Center + Mapbox situation map
- [x] Flutter citizen app skeleton + SOS path (iterate)
- [x] Docker Compose + Nginx
- [x] PWA manifest + minimal service worker (admin)

---

## Phase 1 — Operations-grade incident & dispatch

- [ ] REST API for `dispatch_assignments` (create, update status, list by incident)
- [ ] Emit Socket.IO events on assignment changes; reconcile with incident `assigned_responder_id`
- [ ] Admin UI: dispatch panel, assignment timeline, responder filters
- [ ] BullMQ worker: process `sms-retry` jobs (exponential backoff)

---

## Phase 2 — Location intelligence

- [ ] Throttled GPS ingest endpoints (citizen + responder) with validation
- [ ] Optional `location-batch` worker for high-frequency smoothing / DB batch insert
- [ ] Map layers: last known positions, trails (last N minutes)

---

## Phase 3 — Notifications & SMS hardening

- [ ] `device_tokens` registration endpoint + FCM/APNS integration
- [ ] `notification-fanout` worker for push + in-app notifications
- [ ] SMS abuse detection (velocity per SIM/phone, anomaly alerts)

---

## Phase 4 — Weather & hazard fusion

- [ ] Connectors: PAGASA, OpenWeatherMap, RainViewer tile URLs, PHIVOLCS feeds
- [ ] Normalize alerts into `weather_alerts`; correlate with barangay polygons

---

## Phase 5 — Voice & collaboration

- [ ] Session broker module (short-lived tokens) + `voice_call_logs` writes
- [ ] WebRTC mesh or Agora integration (environment-driven provider)

---

## Phase 6 — Analytics & reporting

- [ ] Read models / materialized views for incident KPIs, MTTA/MTTR-style metrics
- [ ] Export (CSV/PDF) for audits and LGU reporting

---

## Phase 7 — IoT / CCTV / drone / AI (future integration layer)

- [ ] Event ingestion API + adapter pattern (`IntegrationSource` enum + plugins)
- [ ] Queue-based inference hooks; human-in-the-loop confirmation for automated alerts

---

## Cross-cutting (ongoing)

- [ ] Load & chaos testing (partition, latency injection)
- [ ] CI/CD (lint, test, schema migrate, image publish)
- [ ] Staging mirror with anonymized data

Adjust sequencing with Isabela City ICDRRMO operational priorities and funding milestones.
