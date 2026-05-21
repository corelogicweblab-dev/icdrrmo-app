# ICDRRMO AI

Floating assistant **ICDRRMO AI** on Citizen, Chairman, Responder, and Ops dashboards.

## API

- `POST /api/v1/ai/chat` — JWT required (all portal roles)
- `GET /api/v1/ai/health` — public; reports if Gemini is configured

### Request

```json
{
  "message": "May baha ba sa aming barangay?",
  "language": "fil",
  "conversationId": "optional-uuid"
}
```

Languages: `en`, `fil`, `ceb`, `cbk` (Chavacano).

### Engines

1. **gemini** — when `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` is set on the API
2. **context-rag** — rule-based answers from live role context (no external LLM)

## Context sources (per role)

| Role | Data |
|------|------|
| Citizen | Unified feed: safety, weather, evac, community, heatmaps, predictive alerts |
| Chairman | Dashboard, incidents, shelters, vehicles, responders, governance KPIs |
| Responder | Active assignments, citizen medical on incidents, performance |
| Ops | Command-center snapshot, risk matrix, resources |

## Frontend

Component: `admin/src/components/ai/icdrrmo-ai-chat.tsx`  
Mounted on ops chrome, citizen SMART dashboard, chairman, responder layouts.

## Env (Render API)

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```
