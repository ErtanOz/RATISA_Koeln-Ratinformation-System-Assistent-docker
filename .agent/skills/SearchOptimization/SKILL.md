---
name: Search Optimization & AI Logic
description: Strategies for optimizing search queries using Gemini AI and mapping them to OParl API parameters.
---

# Search Optimization & AI Logic

## The Problem

Users search using natural language (e.g., "Last week's decisions on bike lanes"), but the OParl API requires strict parameters (e.g., `minDate=2023-10-01`, `q=Radweg`).

## Strategy: AI-Powered Query Parsing

We use `aiService.ts` to intercept the user's query and "translate" it into a `StructuredSearch` object before calling the API.

### Key Parsing Rules

1.  **Date Resolution**: The AI MUST calculate relative dates ("last week", "yesterday") into specific `YYYY-MM-DD` strings based on the _current date_ provided in the prompt.
2.  **Resource Categorization**:
    - "Sitzungen", "Termine" -> `meetings`
    - "Anträge", "Vorlagen" -> `papers`
    - "Personen" -> `people`
    - "Gremien" -> `organizations`
3.  **Keyword Extraction**: Remove filler words ("show me", "about", "for") and keep only the core search terms.

## Debugging Search

1.  **Check `aiService.ts` Logs**: If search feels "dumb", check if `parseSearchQuery` returned null or a generic "all" resource.
2.  **Verify API Params**: Ensure the translated parameters (e.g., `minDate`) are actually supported by the specific OParl endpoint being called.
3.  **MCP Alignment**: Ensure the tools in `mcp-server` match the logic in the frontend `aiService`.

## Optimization Tips

- **Fuzzy Matching**: The OParl API might be strict. Improve results by sending broader queries and filtering on the client side if necessary (though pagination makes this hard).
- **Synonyms**: The AI prompt should encourage adding synonyms if the user uses colloquial terms (e.g., "Kita" -> "Kindertagesstätte").
