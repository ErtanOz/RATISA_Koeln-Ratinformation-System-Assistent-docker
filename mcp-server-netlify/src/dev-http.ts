import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createOparlServer } from "./server.js";
import {
  applyCorsAndMaybeHandlePreflight,
  isApiKeyAuthorized,
} from "./httpSecurity.js";

const bindHost = process.env.MCP_BIND_HOST || "127.0.0.1";
const app = createMcpExpressApp({ host: bindHost });

app.use((req, res, next) => {
  if (applyCorsAndMaybeHandlePreflight(req, res)) {
    return;
  }
  next();
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", service: "oparl-koeln-mcp-http" });
});

app.all("/mcp", async (req, res) => {
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

const port = Number(process.env.MCP_PORT || process.env.PORT || 3333);
app.listen(port, bindHost, () => {
  console.log(
    `OParl MCP HTTP server listening on http://${bindHost}:${port}/mcp`
  );
});