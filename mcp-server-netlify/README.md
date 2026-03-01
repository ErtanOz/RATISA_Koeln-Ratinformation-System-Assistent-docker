# OParl Köln MCP – HTTP/Netlify

This folder contains the HTTP-compatible MCP server variant (Streamable HTTP with JSON response mode).

## Local development

```powershell
cd mcp-server-netlify
npm.cmd install
npm.cmd run dev:http
```

Default dev endpoint:

- `http://127.0.0.1:3333/mcp`
- health check: `http://127.0.0.1:3333/healthz`

## Environment variables

- `MCP_PORT` (default `3333`)
- `MCP_BIND_HOST` (default `127.0.0.1`)
- `MCP_ALLOWED_ORIGINS` (comma-separated, default `http://localhost:3000,http://127.0.0.1:3000`)
- `MCP_API_KEY` (optional)

### Optional API key protection

If `MCP_API_KEY` is set, requests must include either:

- `x-mcp-api-key: <key>`
- `Authorization: Bearer <key>`

If not set, the endpoint remains open (backwards compatible behavior).

## CORS

CORS and preflight handling are built in for browser-based playground usage.

- Allowed origins come from `MCP_ALLOWED_ORIGINS`.
- `OPTIONS` preflight requests return `204` when origin is allowed.

## Deploy to Netlify

1. Create a new Netlify site.
2. Set **Base directory** to `mcp-server-netlify`.
3. Build command: `npm run build`
4. Functions directory: `netlify/functions`

After deploy, your MCP endpoint is:

`https://<your-site>.netlify.app/.netlify/functions/mcp`

Health endpoint (same function mount):

`https://<your-site>.netlify.app/.netlify/functions/mcp/healthz`

## Notes / limitations

- Stateless JSON response mode is used (no long-lived SSE sessions).
- All tools map to the Cologne OParl API and apply server-side filtering/pagination.