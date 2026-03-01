import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseToolTextResult(result) {
  if (!Array.isArray(result.content)) {
    return [];
  }

  const textPart = result.content.find((part) => part.type === 'text');
  if (!textPart || typeof textPart.text !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(textPart.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function run() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['mcp-server/build/index.js'],
  });

  const client = new Client(
    { name: 'mcp-smoke-stdio', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map((tool) => tool.name);
    const requiredTools = [
      'search_meetings',
      'search_papers',
      'search_organizations',
      'search_people',
      'get_details',
    ];

    for (const toolName of requiredTools) {
      assert(toolNames.includes(toolName), `Missing tool: ${toolName}`);
    }

    const weirdQueryResult = await client.callTool({
      name: 'search_papers',
      arguments: { query: 'zzzz_UNLIKELY_QUERY_2026_ABC987', limit: 25 },
    });

    const normalQueryResult = await client.callTool({
      name: 'search_papers',
      arguments: { query: 'Radverkehr', limit: 25 },
    });

    const weirdItems = parseToolTextResult(weirdQueryResult);
    const normalItems = parseToolTextResult(normalQueryResult);

    const weirdSignature = JSON.stringify(weirdItems.slice(0, 5));
    const normalSignature = JSON.stringify(normalItems.slice(0, 5));

    assert(
      weirdSignature !== normalSignature,
      'search_papers regression: unrelated and normal query returned same top results.'
    );

    const futureMeetingsResult = await client.callTool({
      name: 'search_meetings',
      arguments: { minDate: '2035-01-01', limit: 25 },
    });
    const futureMeetings = parseToolTextResult(futureMeetingsResult);
    assert(
      futureMeetings.length === 0,
      'search_meetings with minDate=2035-01-01 should return no current meetings.'
    );

    const disallowedHostResult = await client.callTool({
      name: 'get_details',
      arguments: { url: 'https://example.com/not-allowed' },
    });

    assert(
      disallowedHostResult.isError === true,
      'get_details should return isError=true for disallowed host.'
    );

    console.log('STDIO smoke test passed.');
  } finally {
    await transport.close();
  }
}

run().catch((error) => {
  console.error('STDIO smoke test failed:', error);
  process.exit(1);
});
