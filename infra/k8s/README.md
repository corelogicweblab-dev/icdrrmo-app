# Kubernetes deployment (scale-out path)

ICDRRMO runs today on **Docker Compose** (local) and **Render + Firebase Hosting** (production).

**Production path:** use the Helm chart at [`../helm/icdrrmo`](../helm/icdrrmo) (API + worker + risk-inference + HA Postgres/Redis + secrets + ingress).

The flat manifests below remain a minimal reference.

## Prerequisites

- PostgreSQL (managed or in-cluster)
- Redis for BullMQ + weather cache
- Container images: `icdrrmo-api`, `icdrrmo-admin` (build from `backend/Dockerfile`, `admin/Dockerfile`)

## Apply

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
# Create secret icdrrmo-secrets (DATABASE_URL, JWT_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON, …)
kubectl apply -f api-deployment.yaml
kubectl apply -f admin-deployment.yaml
kubectl apply -f ingress.yaml
```

Set `OIDC_ISSUER_URL` in secrets for LGU SSO when ready.
