import serverless from "serverless-http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createOparlServer } from "../../src/server";
import {
  applyCorsAndMaybeHandlePreflight,
  isApiKeyAuthorized,
} from "../../src/httpSecurity";

const app = createMcpExpressApp({
  host: process.env.MCP_BIND_HOST || "127.0.0.1",
});

app.use((req, res, next) => {
  if (applyCorsAndMaybeHandlePreflight(req, res)) {
    return;
  }
  next();
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", service: "oparl-koeln-mcp-netlify" });
});

// Netlify functions are mounted under /.netlify/functions/<name>.
// Express 5 / path-to-regexp does not accept "*" as a string path,
// so we use a regex to match any path forwarded to the function.
app.all(/.*/, async (req, res) => {
  if (!isApiKeyAuthorized(req, res)) {
    return;
  }

  const server = createOparlServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: unknown) {
    console.error("Error handling MCP request:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  } finally {
    res.on("close", () => {
      transport.close();
      server.close();
    });
  }
});

export const handler = serverless(app);
