export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpRpcErrorShape {
  code?: number;
  message: string;
  data?: unknown;
}

export interface McpRpcSuccess<T> {
  ok: true;
  status: number;
  elapsedMs: number;
  result: T;
  raw: unknown;
}

export interface McpRpcFailure {
  ok: false;
  status: number;
  elapsedMs: number;
  error: string;
  rpcError?: McpRpcErrorShape;
  raw: unknown;
}

export type McpRpcResult<T> = McpRpcSuccess<T> | McpRpcFailure;

const JSON_RPC_VERSION = "2.0";
const DEFAULT_ACCEPT_HEADER = "application/json, text/event-stream";

let requestId = 1;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function buildHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: DEFAULT_ACCEPT_HEADER,
  };

  if (apiKey && apiKey.trim()) {
    headers["x-mcp-api-key"] = apiKey.trim();
  }

  return headers;
}

function parseMaybeJson(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toReadableError(raw: unknown, fallback: string): { message: string; rpcError?: McpRpcErrorShape } {
  if (raw && typeof raw === "object") {
    const maybeError = (raw as { error?: unknown }).error;
    if (maybeError && typeof maybeError === "object") {
      const rpcError = maybeError as { code?: unknown; message?: unknown; data?: unknown };
      const message =
        typeof rpcError.message === "string" && rpcError.message.trim()
          ? rpcError.message
          : fallback;

      return {
        message,
        rpcError: {
          code: typeof rpcError.code === "number" ? rpcError.code : undefined,
          message,
          data: rpcError.data,
        },
      };
    }
  }

  if (typeof raw === "string" && raw.trim()) {
    return { message: raw };
  }

  return { message: fallback };
}

export async function callMcpRpc<T>(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
  apiKey?: string
): Promise<McpRpcResult<T>> {
  const startedAt = nowMs();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        jsonrpc: JSON_RPC_VERSION,
        id: requestId++,
        method,
        params,
      }),
    });

    const rawText = await response.text();
    const raw = parseMaybeJson(rawText);
    const elapsedMs = Math.round(nowMs() - startedAt);

    if (!response.ok) {
      const parsed = toReadableError(raw, `HTTP ${response.status}`);
      return {
        ok: false,
        status: response.status,
        elapsedMs,
        error: parsed.message,
        rpcError: parsed.rpcError,
        raw,
      };
    }

    const parsed = raw as { result?: unknown; error?: unknown };
    if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
      const errorDetails = toReadableError(raw, "MCP RPC error");
      return {
        ok: false,
        status: response.status,
        elapsedMs,
        error: errorDetails.message,
        rpcError: errorDetails.rpcError,
        raw,
      };
    }

    return {
      ok: true,
      status: response.status,
      elapsedMs,
      result: (parsed?.result ?? null) as T,
      raw,
    };
  } catch (error: unknown) {
    const elapsedMs = Math.round(nowMs() - startedAt);
    return {
      ok: false,
      status: 0,
      elapsedMs,
      error:
        error instanceof Error
          ? `Netzwerkfehler: ${error.message}`
          : "Netzwerkfehler",
      raw: error,
    };
  }
}

export async function listMcpTools(
  endpoint: string,
  apiKey?: string
): Promise<McpRpcResult<{ tools: McpToolInfo[] }>> {
  return callMcpRpc<{ tools: McpToolInfo[] }>(endpoint, "tools/list", {}, apiKey);
}

export async function callMcpTool(
  endpoint: string,
  name: string,
  args: Record<string, unknown>,
  apiKey?: string
): Promise<McpRpcResult<Record<string, unknown>>> {
  return callMcpRpc<Record<string, unknown>>(
    endpoint,
    "tools/call",
    {
      name,
      arguments: args,
    },
    apiKey
  );
}

export function parseToolArguments(input: string):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, value: {} };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        error: "Tool-Argumente müssen ein JSON-Objekt sein.",
      };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Ungültiges JSON: ${error.message}`
          : "Ungültiges JSON.",
    };
  }
}