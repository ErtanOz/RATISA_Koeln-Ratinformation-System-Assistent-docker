# OParl Köln MCP Server (stdio)

This is a Model Context Protocol (MCP) server that connects AI assistants to the City of Cologne's Council Information System (Ratsinformationssystem) via the OParl API.

## Setup

1. Navigate to this directory:
   ```bash
   cd mcp-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```

## Usage

Configure your MCP client (Claude Desktop, Cursor, etc.) to run this server.

- **Command:** `node`
- **Args:** `/absolute/path/to/mcp-server/build/index.js`

Example (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ratsinfo-koeln": {
      "command": "node",
      "args": ["C:/path/to/project/mcp-server/build/index.js"]
    }
  }
}
```

## Tools

- `search_meetings`
- `search_papers`
- `search_organizations`
- `search_people`
- `get_details`

### Optional pagination arguments (non-breaking)

All search tools now support optional:

- `page` (default `1`)
- `limit` (default `25`, max `100`)

### Search behavior

The OParl API ignores many filter parameters server-side. This server therefore:

- fetches up to 200 records
- applies `query` and date/type filtering server-side
- returns filtered and paginated JSON arrays

## Safety

`get_details` only allows HTTPS URLs under:

- host: `buergerinfo.stadt-koeln.de`
- path prefix: `/oparl/`