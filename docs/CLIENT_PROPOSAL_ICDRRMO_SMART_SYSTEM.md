# Mungkahi sa Proyekto | Project Proposal  
## ICDRRMO SMART Emergency Response System  
**Isabela City Disaster Risk Reduction and Management Office (ICDRRMO)**

| Field | Value |
|--------|--------|
| **Document title** | Client proposal — ICDRRMO SMART Emergency Response System |
| **Version** | 1.0 |
| **Date** | 9 May 2026 |
| **Prepared for** | Isabela City ICDRRMO, City Government of Isabela, Basilan |
| **Prepared by** | CoreLogic (implementation partner) |
| **Repository / product** | ICDRRMO SMART — full-stack emergency coordination platform |
| **Companion technical docs** | [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`ENTERPRISE_ECOSYSTEM.md`](./ENTERPRISE_ECOSYSTEM.md), [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md), [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md) |

---

## 1. Buod para sa pamunuan (Executive summary — Filipino)

Ang **ICDRRMO SMART Emergency Response System** ay isang modernong digital na plataporma na idinisenyo upang palakasin ang kakayahan ng tanggapan sa **mabilis na pagtugon**, **malinaw na komunikasyon**, at **maayos na koordinasyon** sa panahon ng sakuna, medikal na emerhensiya, at iba pang krisis. Sa halip na mag-asa lamang sa telepono at mano-manong tala, binibigyan ng sistema ang **mamamayan**, **responder**, at **opisina ng operasyon** ng iisang pinagbabatayan ng impormasyon — mula sa pagpaparehistro ng citizen hanggang sa live na monitoring ng insidente sa mapa.

Ang solusyon ay binubuo ng: **mobile app para sa mamamayan (Flutter)**, **web na Operation Center para sa ops / operator (Next.js)**, **PWA na Citizen Emergency page** (maaaring i-install sa telepono), at **matatag na backend API (NestJS)** na may **PostgreSQL**, **realtime na Socket.IO**, **Redis** para sa sukat at pila ng trabaho, at suporta para sa **SMS ingest**, **push notifications (FCM)**, **panahon / babala**, **evacuation centers**, **barangay data**, at **audit trail** — angkop sa layuning **transparent, masusubaybayan, at handang lumago** kasabay ng pangangailangan ng lungsod.

Dokumentong ito ay naglalahad ng **benepisyo**, **saklaw ng sistema**, **arkitektura**, **detalye ng citizen registration**, **seguridad at privacy**, at **landas ng patuloy na pag-unlad** upang matiyak na malinaw sa kliyente ang halaga ng pamumuhunan sa teknolohiya at ang **propesyonal na antas** ng hatid na sistema.

---

## 2. Executive summary (English)

The **ICDRRMO SMART Emergency Response System** is an integrated digital platform that connects **citizens**, **field responders**, and **operations staff** through a single, authoritative backend. It reduces time-to-awareness for emergencies, improves location capture (GPS + optional SMS channel), and gives the operations center a **live incident picture**, **maps**, **notifications**, and **structured citizen profiles** (including medical and barangay context) to support dispatch decisions.

The solution is engineered for **reliability**, **auditability**, and **growth**: a modular NestJS API, PostgreSQL with Prisma migrations, Redis-backed realtime scaling, Docker-based deployment, and a clear path from today’s **modular monolith** toward additional workers and integrations described in the enterprise blueprint—without breaking day-one operations.

This proposal is written to **inform and impress stakeholders**: it is detailed enough for technical review, yet structured for LGU leadership to see **outcomes**, **risk controls**, and **alignment with disaster response mandates**.

---

## 3. Problem statement & strategic fit

| Challenge (typical LGU EOC) | How SMART addresses it |
|------------------------------|-------------------------|
| Scattered channels (calls, radio, chat) with no single queue | Central **incident** model with status lifecycle, ops dashboard, and realtime updates |
| Weak citizen identity & medical context at time of SOS | **Structured registration** (name, DOB, gender, blood type, medical notes, address, barangay, photo, contact) tied to the same account used for SOS |
| Delayed situational awareness | **Socket.IO** event stream + situation **map** + dashboard metrics |
| Poor visibility when mobile data fails | Architecture supports **SMS ingest** grammar and mobile **offline-oriented** patterns (see mobile README / architecture) |
| Accountability & disputes | **Audit logs**, incident logs, RBAC (roles: citizen, responder, operator, admin) |
| Future weather / hazard integration | **Weather** module, alerts, scheduled jobs — connectors can be expanded per `IMPLEMENTATION_ROADMAP.md` |

Strategic alignment (non-exhaustive): supports local DRRM coordination objectives consistent with **Republic Act No. 10121** (Philippine Disaster Risk Reduction and Management Act) themes—**preparedness**, **response**, and **recovery**—through better information infrastructure; **Republic Act No. 10173** (Data Privacy Act of 2012) is addressed through design choices in Section 9.

---

## 4. Stakeholder value proposition

### 4.1 Citizens (mamamayan)

- **Self-service registration** with complete demographic and medical intake (Section 7).
- **SOS** submission with **GPS** from the mobile app and **Citizen Emergency** web (PWA-friendly).
- **Profile** path for evacuation centers and safety-related information (as implemented in app routes).
- **Push notifications** (Firebase Cloud Messaging) for alerts and operational messaging when devices register tokens.

### 4.2 Field responders

- Dedicated **responder** flows in the ecosystem (Flutter responder surfaces + profile/assignment concepts in schema).
- **Responder status** model (available, dispatched, en route, on scene, etc.) in the database — foundation for dispatch UI evolution.

### 4.3 Operations center & ICDRRMO leadership

- **Next.js Operation Center** (`/ops`): command-style UI, incident queue, situation map, modules for users, vehicles, barangays, evacuation, notifications, weather, reports, voice hooks (RTC module), system settings.
- **Realtime** visibility via Socket.IO; **horizontal scale** option via Redis adapter when `REDIS_URL` is configured.
- **Barangay** master data with operational extensions (e.g. hazard / ops-oriented fields where implemented) for LGU-centric operations.

### 4.4 City ICT / admin / compliance

- **Docker Compose** topology: Postgres, Redis, API, admin, Nginx — reproducible staging/production.
- **JWT + refresh** sessions, throttling guard, structured modules for audit and health checks.
- Clear **documentation set** for architecture, enterprise evolution, deployment (e.g. Render), and phased roadmap.

---

## 5. System scope — what the platform is

**ICDRRMO SMART** is a **full-stack emergency response platform**, not a single brochure website. It includes:

| Layer | Technology | Role |
|-------|------------|------|
| Citizen mobile | **Flutter** (Riverpod, Dio, local persistence patterns) | Primary field client for SOS, profile, onboarding, tracking, communications |
| Citizen web | **Next.js** (`/citizen`) | Register, sign-in, SOS, installable experience; shares API with mobile |
| Operation Center | **Next.js 15** (`/ops`, `/signin/operator`, etc.) | Live operations, maps, incidents, roster, configuration |
| API | **NestJS** (REST + **Socket.IO** `/realtime`) | Business rules, auth, incidents, SMS, weather, notifications, push, barangays, evacuation, dashboard, RTC scaffolding |
| Database | **PostgreSQL** + **Prisma ORM** | Normalized entities: users, profiles, incidents, locations, barangays, vehicles, responders, notifications, weather, audit |
| Caching / realtime scale | **Redis** | Socket.IO adapter + job queue foundation (BullMQ registration) |
| Edge | **Nginx** | TLS, `/api` → API, `/socket.io` WebSocket upgrade, `/` → admin |

For a diagrammatic view, see **`ARCHITECTURE.md`** (Mermaid diagrams).

---

## 6. Detailed functional inventory (high level)

The following reflects **modules present in the backend application** (`AppModule`) and their operational intent. Exact UI coverage per screen may evolve; the **API and data model** are the contract for long-term delivery.

| Domain | Capabilities (summary) |
|--------|-------------------------|
| **Authentication** | Register, login, JWT access + refresh; Firebase custom token bridge where configured; role-aware behavior |
| **Users & profiles** | Citizen medical + barangay + street; availability; profile photo URLs; `/users/me` patterns |
| **Incidents** | SOS creation, types (fire, flood, medical, crime, typhoon, etc.), status machine, deduplication concepts, channel (app vs SMS) |
| **Realtime** | Live fan-out to ops clients; Redis adapter for multi-instance deployments |
| **SMS** | Inbound webhook + parsing + dedupe for GSM / gateway integration |
| **Barangays** | Public list for registration; authenticated lists for staff; ops-oriented hazard fields (as per current schema / admin pages) |
| **Evacuation centers** | Registry for citizen profile / ops reference |
| **Notifications** | In-app / outbound notification model; integration with push service |
| **Push (FCM)** | Device token registration; server-side push for citizens (weather schedules / hazard broadcasts where wired) |
| **Weather** | Alerts API surface; scheduled weather-related jobs (environment-driven) |
| **Map** | Map-related API support for admin situation map |
| **Dashboard** | Aggregated stats for ops home |
| **Alerts** | System / operational alerts surface |
| **Responders & vehicles** | Roster, status, fleet concepts for dispatch evolution |
| **RTC** | Voice / collaboration scaffolding (provider-ready) |
| **Audit** | Security-sensitive actions logging |
| **Health** | Operational health endpoints for uptime monitoring |

Phased enhancements (dispatch assignment REST depth, certain workers, external hazard connectors) are tracked honestly in **`IMPLEMENTATION_ROADMAP.md`** — the proposal does not claim completion of every Phase 1–7 checkbox; it claims a **strong foundation** and a **credible path** to enterprise-grade operations.

---

## 7. Citizen registration — complete specification (required intake)

Citizen accounts are anchored on **high-quality intake** so responders and the EOC see trustworthy context during an emergency. The following fields are **required** across **mobile (Flutter)** and **Citizen web** registration, aligned with the **`POST /auth/register`** contract:

| # | Field | Type / behavior | Notes |
|---|--------|-----------------|-------|
| 1 | **Full name** | Text (min/max per DTO) | Display name for ops and medical handoff |
| 2 | **Date of birth** | ISO date `YYYY-MM-DD` | Date picker (mobile); date input (web) |
| 3 | **Age** | Read-only, computed | Derived from DOB; not stored as editable source of truth |
| 4 | **Gender** | Enum: `MALE`, `FEMALE`, `OTHER` | Dropdown |
| 5 | **Blood type** | Enum: `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `O_POS`, `O_NEG`, `AB_POS`, `AB_NEG` | Dropdown with Rh factor |
| 6 | **Medical issues** | Text area (required) | Conditions / notes for responders (subject to future “none / N/A” policy if LGU requests) |
| 7 | **Street** | Text (`streetPurok`) | Street / purok line |
| 8 | **Barangay** | Dropdown from **public barangay list** (API) with **offline seed fallback** (`IC-xxx` codes) | API sends either `barangayId` (UUID) or `barangayCode` — never both |
| 9 | **Contact number** | E.164-like (`+` optional, 8–15 digits) | Normalized before submit |
| 10 | **Profile picture** | Required upload | **JPEG / PNG / WebP** as `data:image/...;base64,...` or HTTPS URL per server validation; size limits enforced server-side |
| 11 | **Email & password** | Account credentials | Password policy (e.g. minimum length) per DTO |

**Backend validation highlights:** reasonable birthday (not future; age band 1–120), normalized photo URL scheme, exactly one barangay identifier. **Mobile** uses extended HTTP timeouts for large photo payloads. **Web** uses `AbortSignal.timeout` when supported for long uploads.

This registration depth is a **differentiator** for LGU clients: it demonstrates seriousness about **pre-hospital context** and **local addressing** (barangay), not generic “username only” apps.

---

## 8. Technical architecture highlights (why decision-makers should care)

1. **Single source of truth** — PostgreSQL holds authoritative incidents, users, and audit data; clients are views/controllers.
2. **Realtime without refresh spam** — Socket.IO reduces operator cognitive load during spikes.
3. **Scale path** — Redis adapter documented for multiple API replicas behind Nginx.
4. **Security baseline** — Throttling, JWT sessions, role separation, audit module presence.
5. **Deployability** — Docker Compose + documented cloud paths reduce vendor lock-in to “only one server.”
6. **Maintainability** — Prisma migrations, modular NestJS boundaries, typed Next.js app router.

---

## 9. Security, privacy, and governance

| Topic | Approach |
|-------|----------|
| **Authentication** | JWT access tokens + refresh token flow; hashed passwords in database |
| **Transport** | TLS at Nginx in production layouts |
| **Authorization** | RBAC (`CITIZEN`, `RESPONDER`, `OPERATOR`, `ADMIN`, `SUPER_ADMIN`) |
| **Personal data** | Citizen profiles store medical and contact data **by design** for emergency use — requires **explicit lawful basis**, **retention policy**, and **access minimization** under **DPA 2012**; recommend **Privacy Impact Assessment (PIA)** and internal **data sharing agreements** before full production |
| **Audit** | Audit logs module for security-sensitive operations |
| **Rate limiting** | Global throttler configured on API |

**Recommendation:** Appoint a **Data Protection Officer (DPO)** consultant if the city does not already have one; align retention of photos and medical text with **ICDRRMO / CHO** policy.

---

## 10. Deployment & operations

- **Local / staging / production-like:** `docker-compose.yml` with Postgres, Redis, API (migrate on start), admin build, Nginx.
- **Cloud:** See **`RENDER_DEPLOY.md`** for Render-oriented notes; other clouds (AWS, Azure, on-prem VM) remain compatible with the same containers.
- **Backups:** PostgreSQL backup strategy is the responsibility of operations — proposal recommends automated daily snapshots + tested restore drills.

---

## 11. Delivery status & roadmap honesty

| Category | Status narrative |
|----------|------------------|
| **Foundation** | Strong: auth, schema, incidents, realtime, SMS ingest, ops UI, citizen web+mobile paths, Docker, Redis hooks |
| **Citizen intake** | Registration fields implemented per Section 7 (mobile + web aligned to API) |
| **Push & notifications** | Device tokens + FCM integration path present in codebase |
| **Enterprise extras** | Dispatch depth, some BullMQ workers, external weather connectors, advanced analytics — **phased** per `IMPLEMENTATION_ROADMAP.md` |

This honesty **builds trust**: the client sees both **today’s wins** and a ** funded sequence** for what comes next.

---

## 12. Training, change management, and go-live

| Workstream | Recommendation |
|------------|----------------|
| **EOC SOP alignment** | Map software statuses to existing radio / phone SOPs |
| **Training** | Half-day operator + half-day supervisor + citizen orientation materials (QR to `/citizen`) |
| **Pilot** | 2–4 week pilot barangay + volunteer responders before citywide marketing |
| **Hotline** | Publish ops voice hotline and SMS gateway numbers alongside app |

---

## 13. Risk register (summary)

| Risk | Mitigation |
|------|------------|
| Misconfiguration of API URL in mobile/admin | Environment templates + checklists in `RENDER_DEPLOY` / `.env.example` |
| Large photo uploads on poor networks | Compression on client, timeouts, user guidance |
| SMS abuse | Roadmap includes velocity detection (`IMPLEMENTATION_ROADMAP.md`) |
| Privacy litigation | PIA, consent copy, retention, role-based access reviews |

---

## 14. Conclusion — why this should impress the client

Ang **ICDRRMO SMART** ay hindi lamang “app” — ito ay **natatanging plataporma** na:

- **Pinagsasama** ang mamamayan, responder, at opisina sa iisang sistema.  
- **May propesyonal na arkitektura** (PostgreSQL, Redis, Docker, NestJS, Next.js, Flutter) na karaniwan sa mas malalaking lungsod — ngunit **akma sa Isabela City**.  
- **May malinaw na dokumentasyon** at **landas ng pag-unlad** (`ENTERPRISE_ECOSYSTEM.md`, `IMPLEMENTATION_ROADMAP.md`).  
- **May matibay na citizen registration** na nagpapakita ng **seryosong pag-aalaga** sa medikal at lokasyon na datos bago pa man dumating ang emerhensiya.

In English, for records: **this proposal demonstrates maturity** — technical depth, LGU-appropriate intake, security awareness, and a roadmap that respects fiscal reality. CoreLogic presents the ICDRRMO SMART system as a **long-term partnership asset** for Isabela City’s resilience.

---

## 15. Approval block (optional sign-off)

| Role | Name | Signature | Date |
|------|------|-----------|------|
| City DRRM Officer / ICDRRMO Head | | | |
| City Administrator / Authorized representative | | | |
| ICT Officer | | | |
| CoreLogic / Implementing partner | | | |

---

## 16. References (internal)

- Root overview: [`../README.md`](../README.md)  
- Architecture: [`./ARCHITECTURE.md`](./ARCHITECTURE.md)  
- Enterprise blueprint: [`./ENTERPRISE_ECOSYSTEM.md`](./ENTERPRISE_ECOSYSTEM.md)  
- Roadmap: [`./IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md)  
- Deploy notes: [`./RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)  
- Mobile Firestore notes: [`../mobile/docs/FIRESTORE_CLIENT.md`](../mobile/docs/FIRESTORE_CLIENT.md)  

---

*End of document — ICDRRMO SMART Client Proposal v1.0*
