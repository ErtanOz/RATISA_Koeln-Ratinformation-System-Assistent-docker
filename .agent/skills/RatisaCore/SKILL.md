---
name: Ratisa Core Development
description: Guidelines for developing the RATISA (Köln Council Information System) application, including Tech Stack, API usage, and Design System.
---

# Ratisa Core Development

## Project Overview

RATISA is a modern web application designed to make the Cologne City Council information system (Ratsinformationssystem) accessible and searchable. It uses the OParl API.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS (inferred from usage patterns) or Vanilla CSS with "Glassmorphism" aesthetics.
- **Routing**: React Router DOM v7
- **AI**: Google Gemini 2.0 Flash (via `@google/genai`)
- **MCP**: Model Context Protocol SDK for local server capabilities.

## Key Directories

- `/services`: API integrations (`oparlApiService.ts`, `aiService.ts`)
- `/mcp-server`: Local MCP server for bridging AI and OParl data.
- `/components`: Reusable UI components.

## Design Guidelines

- **Aesthetics**: Premium, modern, "Glassmorphism" (translucent backgrounds, blur effects).
- **Responsiveness**: Mobile-first approach.
- **Feedback**: Always provide visual feedback for loading states (spinners, skeletons).

## OParl API Best Practices

- **Base URL**: `https://buergerinfo.stadt-koeln.de/oparl/bodies/stadtverwaltung_koeln`
- **CORS**: The API has CORS restrictions. Use the configured `CORS_PROXY` or the local MCP server for data fetching where direct access fails.
- **Pagination**: Lists are paginated. Always check for `next` links.

## AI Integration

- Use `aiService.ts` for all direct AI calls.
- Use `mcp-server` for tool-based interactions where the AI needs to "browse" or "search" the data autonomously.
