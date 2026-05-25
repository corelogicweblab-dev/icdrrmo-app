# Firebase Hosting deploy (admin PWA)

Hosting serves **`admin/out`** from a **static export** (`STATIC_EXPORT=1`). A normal `next build` without export does **not** refresh `admin/out`.

## Correct deploy paths

| Method | Command |
|--------|---------|
| **GitHub Actions** (recommended) | Push to `main` — workflow `firebase-hosting-merge.yml` runs `npm run export` then `firebase deploy` |
| **Local** | From repo root: `npm run deploy:hosting` (requires `admin/.env.deploy` with absolute API URLs) |

## Required env (bake into JS bundle)

```
NEXT_PUBLIC_API_URL=https://icdrrmo-backend-q04d.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=https://icdrrmo-backend-q04d.onrender.com
```

GitHub repo secrets must match. Wrong host (e.g. `icdrrmo-app-1`) breaks login.

## Verify live site

1. Home `/` footer line: `Web build <git-sha> · SMART dashboards + ICDRRMO AI`
2. `/citizen` title: **SMART Citizen Dashboard**
3. Hard refresh: Ctrl+Shift+R (or clear site data) — old `_next/static` chunks may cache in the browser
4. After deploy, service worker `sw.js` version `v2026-05-21-smart-ai` should reload

## Do not

- Run `firebase deploy` without running `npm run export` first
- Use relative `/api/v1` in `NEXT_PUBLIC_API_URL` on static hosting
