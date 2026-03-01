import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  callMcpRpc,
  listMcpTools,
  parseToolArguments,
} from './mcpPlaygroundService';

describe('mcpPlaygroundService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses valid JSON object arguments', () => {
    const result = parseToolArguments('{"query":"Radverkehr"}');
    expect(result).toEqual({ ok: true, value: { query: 'Radverkehr' } });
  });

  it('rejects non-object JSON arguments', () => {
    const result = parseToolArguments('[1,2,3]');
    expect(result.ok).toBe(false);
    if (!result.ok && 'error' in result) {
      expect(result.error).toContain('JSON-Objekt');
    }
  });

  it('sends required MCP headers including optional API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: [] },
        }),
        { status: 200 }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    await callMcpRpc<{ tools: unknown[] }>(
      '/mcp-http',
      'tools/list',
      {},
      'test-key-123'
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = request.headers as Record<string, string>;

    expect(headers['Accept']).toBe('application/json, text/event-stream');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-mcp-api-key']).toBe('test-key-123');
  });

  it('parses JSON-RPC errors correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32602, message: 'Invalid params' },
        }),
        { status: 200 }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await listMcpTools('/mcp-http');

    expect(result.ok).toBe(false);
    if (!result.ok && 'error' in result) {
      expect(result.error).toContain('Invalid params');
      expect('rpcError' in result ? result.rpcError?.code : undefined).toBe(-32602);
    }
  });

  it('returns readable error for non-OK HTTP responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
        status: 401,
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await listMcpTools('/mcp-http');

    expect(result.ok).toBe(false);
    if (!result.ok && 'error' in result) {
      expect(result.status).toBe(401);
      expect(result.error).toContain('Unauthorized');
    }
  });
});
