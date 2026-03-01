import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServerReady(childProcess, timeoutMs = 20_000) {
  let ready = false;
  let stdout = '';
  let stderr = '';

  childProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    if (text.includes('listening on')) {
      ready = true;
    }
  });

  childProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const startedAt = Date.now();
  while (!ready && Date.now() - startedAt < timeoutMs) {
    await sleep(200);
  }

  if (!ready) {
    throw new Error(`HTTP server did not start in time. stdout=${stdout} stderr=${stderr}`);
  }
}

async function run() {
  const port = 3343;
  const host = '127.0.0.1';
  const endpoint = `http://${host}:${port}/mcp`;
  const apiKey = 'smoke-test-key';

  const child = spawn('node', ['mcp-server-netlify/build/dev-http.js'], {
    env: {
      ...process.env,
      MCP_PORT: String(port),
      MCP_BIND_HOST: host,
      MCP_API_KEY: apiKey,
      MCP_ALLOWED_ORIGINS: 'http://localhost:3000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServerReady(child);

    const unauthorizedResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    assert(unauthorizedResponse.status === 401, 'Expected 401 for missing API key.');

    const authorizedResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'x-mcp-api-key': apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });

    assert(authorizedResponse.status === 200, 'Expected 200 for authorized tools/list call.');
    const authorizedJson = await authorizedResponse.json();
    assert(
      Array.isArray(authorizedJson?.result?.tools) && authorizedJson.result.tools.length >= 5,
      'Expected tools/list result with at least 5 tools.'
    );

    const preflightResponse = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,accept,x-mcp-api-key',
      },
    });

    assert(preflightResponse.status === 204, 'Expected 204 for CORS preflight.');
    assert(
      preflightResponse.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'Expected Access-Control-Allow-Origin for allowed origin.'
    );

    console.log('HTTP smoke test passed.');
  } finally {
    child.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error('HTTP smoke test failed:', error);
  process.exit(1);
});