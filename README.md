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
   - `VITE_MCP_HTTP_ENDPOINT=/mcp-http` (optional, defaults to `/mcp-http`)
   - `MCP_API_KEY=...` (optional, only needed for HTTP MCP server protection)
   - `MCP_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
   - `MCP_PORT=3333`
   - `MCP_BIND_HOST=127.0.0.1`
   - Important: keep each key only once in the file. Duplicate env keys override earlier values.
3. Run the app:
   `npm run dev`

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
