# J.A.R.V.I.S. — Iron Man HUD voice assistant

Stack: Vite + React SPA (frontend), Express API (backend) proxying Google Gemini.

## Run

```
docker compose -f docker-compose.base44.yml up -d
```

- `web` — Vite dev server, host port 3000 → container 5173, binds 0.0.0.0.
- `api` — Express on 8000 (also exposed on host for debugging). Endpoints: `GET /api/health`, `POST /api/chat` with `{ "messages": [{ "role": "user"|"assistant", "text": "..." }] }` → `{ "reply": "..." }`.
- Vite proxies `/api` to `http://api:8000` (set via `VITE_API_PROXY_TARGET`; defaults to `http://localhost:8000` when running Vite outside compose).

## Secrets

- `GEMINI_API_KEY` — user-provided (Google AI Studio, https://aistudio.google.com/apikey). Delivered to the `api` service via `/run/base44/app.env`. The app boots without it; `/api/health` then reports `apiKeyConfigured: false` and `/api/chat` returns 503 with a clear message.

## Verify

```
curl http://localhost:3000/                 # HUD HTML served by Vite dev server
curl http://localhost:8000/api/health       # {"ok":true,...,"apiKeyConfigured":true|false}
curl -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","text":"hello"}]}'
```

## Quirks

- Speech recognition (voice input) uses the Web Speech API — Chrome/Edge only and needs mic permission. The HUD falls back to typed input and shows "VOICE OFFLINE" elsewhere. Speech output uses `speechSynthesis` (widely supported).
- No lockfile is committed; `npm install` runs at container start. Root and `server/` have separate `node_modules` dirs, so the two concurrent installs don't collide.
- Vite dev host checking: the platform-provided `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` env var (Vite >= 6.1) is passed through in compose so the preview origin can load dev assets/HMR.
