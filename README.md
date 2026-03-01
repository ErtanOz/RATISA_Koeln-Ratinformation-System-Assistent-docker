<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1wPCT5Ku6Jx1fouL5OvbVuH1Hq-nh3751

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure [.env.local](.env.local):
   - `GEMINI_API_KEY=...`
   - `GEMINI_MODEL=gemini-2.5-flash` (optional override)
   - `GEMINI_FALLBACK_MODELS=gemini-flash-latest` (optional comma-separated fallback list)
   - `OPENROUTER_API_KEY=...` (optional fallback provider)
   - `VITE_ENABLE_AI=true` (optional, defaults to `true` in dev and `false` in production)
   - `VITE_OPARL_PROXY_PREFIX=/oparl` (optional, defaults to `/oparl`)
   - `VITE_OPARL_BODY_ID=stadtverwaltung_koeln` (optional, defaults to `stadtverwaltung_koeln`)
   - `VITE_OPARL_REQUEST_TIMEOUT_MS=30000` (optional, defaults to `30000`; increase on slow VPS links)
   - `VITE_MCP_HTTP_ENDPOINT=/mcp-http` (optional, defaults to `/mcp-http`)
   - `MCP_API_KEY=...` (optional, only needed for HTTP MCP server protection)
   - `MCP_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
   - `MCP_PORT=3333`
   - `MCP_BIND_HOST=127.0.0.1`
   - Important: keep each key only once in the file. Duplicate env keys override earlier values.
3. Run the app:
   `npm run dev`

## VPS Deployment (Dokploy + Dockerfile)

This repository includes a production Docker image setup for Dokploy:

- `Dockerfile` (multi-stage build with `node:20-alpine` + `nginx:alpine`)
- `deploy/nginx/ratisa.docker.conf` (SPA fallback + `/oparl/` reverse proxy)

### Dokploy setup

1. Disable or remove your old `Static Site` app to avoid domain conflicts.
2. Create a new Dokploy application from this repository.
3. Select `Dockerfile` deployment.
4. Set Dockerfile path to `/Dockerfile`.
5. Set container/exposed port to `80`.
6. Attach your domain to this new app.
7. Keep SSL termination in Dokploy (no TLS config needed inside container).

### Why this fixes the error

The app fetches OParl data from same-origin `/oparl/*`.  
If `/oparl/*` falls back to `index.html`, the frontend receives HTML instead of JSON and shows:
`Ungültige API-Antwort: HTML statt JSON`.

The container Nginx config fixes this by enforcing:

- `location /oparl/` -> `https://buergerinfo.stadt-koeln.de/oparl/`
- `location /` -> `try_files $uri /index.html`
- `/oparl/` block is above `/`

### Smoke checks after deploy

```bash
curl -I https://<your-domain>/
curl -I "https://<your-domain>/oparl/bodies/stadtverwaltung_koeln/papers?limit=1"
```

Expected:
- `/` returns `200`
- `/oparl/...` returns `200` with `content-type: application/json`

### Troubleshooting checklist

- If browser shows `Unexpected token '<'`, your `/oparl/*` route is returning HTML instead of JSON.
- If `/oparl/...` returns `404`, your reverse proxy block is missing or placed after SPA fallback.
- If AI features should remain off in production, keep `VITE_ENABLE_AI=false` (or unset it; production default is disabled).

### Rollback

If deployment fails, remap the domain back to the previous app in Dokploy.

## Manual VPS Deployment (Nginx)

If you deploy without Docker/Dokploy, use:

1. `npm run build`
2. Upload `dist/` to your VPS (for example `/var/www/ratisa/dist`)
3. Apply `deploy/nginx/ratisa.conf`
4. `sudo nginx -t && sudo systemctl reload nginx`

## MCP Development

### HTTP MCP server (for `/mcp` playground)

Run the local HTTP MCP server:

```bash
npm run mcp:http:dev
```

Default endpoint:

`http://127.0.0.1:3333/mcp`

The frontend dev server proxies `/mcp-http` to that endpoint.

### Smoke tests

Run MCP smoke tests:

```bash
npm run mcp:smoke:stdio
npm run mcp:smoke:http
```

### `/mcp` Playground

The `/mcp` page now includes an HTTP playground with:

- endpoint input (defaults to `VITE_MCP_HTTP_ENDPOINT` or `/mcp-http`)
- optional API key input (`x-mcp-api-key`)
- `tools/list` execution
- `tools/call` execution with editable JSON arguments
- status, latency, and raw JSON-RPC response preview
