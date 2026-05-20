# ICDRRMO Helm chart (production K8s)

Deploys the Nest API, BullMQ SMS worker, TensorFlow risk-inference service, and optional **HA PostgreSQL + Redis** via Bitnami subcharts.

## Prerequisites

- Kubernetes 1.28+
- Helm 3.14+
- Container images built and pushed to your registry:
  - `icdrrmo-api` (from `backend/Dockerfile`)
  - `icdrrmo-risk-inference` (from `services/risk-inference/Dockerfile`)
- Admin UI remains on **Firebase Hosting** unless you add a separate static chart.

## Install

```bash
cd infra/helm/icdrrmo
helm dependency update
helm upgrade --install icdrrmo . \
  --namespace icdrrmo --create-namespace \
  --set secrets.data.JWT_ACCESS_SECRET="$(openssl rand -base64 48)" \
  --set secrets.data.OIDC_ISSUER_URL="https://login.lgu.gov.ph/realms/icdrrmo" \
  --set secrets.data.OIDC_CLIENT_ID="icdrrmo-ops" \
  --set secrets.data.OIDC_CLIENT_SECRET="***" \
  --set secrets.data.OIDC_REDIRECT_URI="https://api.yourlgu.gov.ph/api/v1/auth/oidc/callback" \
  --set ingress.host=api.yourlgu.gov.ph
```

## External managed databases

Disable in-cluster data plane and point secrets at your cloud URLs:

```bash
helm upgrade --install icdrrmo . \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set secrets.data.DATABASE_URL="postgresql://..." \
  --set secrets.data.REDIS_URL="rediss://..."
```

## Components

| Workload | Purpose |
|----------|---------|
| `icdrrmo-api` | Nest REST + WebSocket, OIDC callback, command center |
| `icdrrmo-worker` | BullMQ notification fan-out + outbound SMS gateway |
| `icdrrmo-risk-inference` | TensorFlow `/predict` for barangay risk matrix |
| Bitnami PostgreSQL | Replication architecture (primary + read replicas) |
| Bitnami Redis | Replication for BullMQ + weather cache |

## Secrets reference

See `templates/secret.yaml` for keys: `JWT_ACCESS_SECRET`, `DATABASE_URL`, `REDIS_URL`, OIDC trio, `SMS_GATEWAY_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_WEB_URL`.
