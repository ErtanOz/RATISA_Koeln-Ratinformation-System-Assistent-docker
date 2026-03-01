import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
const BASE_URL = "https://buergerinfo.stadt-koeln.de/oparl/bodies/stadtverwaltung_koeln";
const ALLOWED_HOST = "buergerinfo.stadt-koeln.de";
const ALLOWED_PATH_PREFIX = "/oparl/";
const FETCH_TIMEOUT_MS = 15_000;
const FETCH_PAGE_SIZE = 200;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
class OparlRequestError extends Error {
    kind;
    status;
    constructor(kind, message, status) {
        super(message);
        this.name = "OparlRequestError";
        this.kind = kind;
        this.status = status;
    }
}
function buildOparlUrl(endpoint) {
    const trimmedEndpoint = endpoint.trim();
    if (!trimmedEndpoint) {
        throw new OparlRequestError("validation", "Endpoint darf nicht leer sein.");
    }
    if (trimmedEndpoint.startsWith("http")) {
        return new URL(trimmedEndpoint);
    }
    return new URL(`${BASE_URL}/${trimmedEndpoint.replace(/^\/+/, "")}`);
}
function assertAllowedOparlUrl(url) {
    if (url.protocol !== "https:") {
        throw new OparlRequestError("validation", "Nur HTTPS-URLs sind erlaubt.");
    }
    if (url.hostname !== ALLOWED_HOST) {
        throw new OparlRequestError("validation", `Nur ${ALLOWED_HOST} ist erlaubt.`);
    }
    if (!url.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
        throw new OparlRequestError("validation", "Nur OParl-Pfade sind erlaubt.");
    }
}
function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}
function toDatePrefix(value) {
    if (typeof value !== "string" || value.length < 10) {
        return null;
    }
    return value.slice(0, 10);
}
function normalizePagination(args) {
    const raw = (args ?? {});
    const rawPage = toNumber(raw.page);
    const rawLimit = toNumber(raw.limit);
    const page = Math.max(DEFAULT_PAGE, Math.floor(rawPage ?? DEFAULT_PAGE));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit ?? DEFAULT_LIMIT)));
    return { page, limit };
}
function normalizeQuery(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}
function includesAnyField(query, fields) {
    if (!query) {
        return true;
    }
    return fields.some((field) => {
        if (typeof field !== "string") {
            return false;
        }
        return field.toLowerCase().includes(query);
    });
}
function matchesDateRange(value, minDate, maxDate) {
    if (!minDate && !maxDate) {
        return true;
    }
    const date = toDatePrefix(value);
    if (!date) {
        return false;
    }
    if (minDate && date < minDate) {
        return false;
    }
    if (maxDate && date > maxDate) {
        return false;
    }
    return true;
}
function paginate(items, page, limit) {
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
}
function readDataArray(payload) {
    if (payload && typeof payload === "object") {
        const maybeArray = payload.data;
        if (Array.isArray(maybeArray)) {
            return maybeArray;
        }
    }
    return [];
}
async function fetchOparl(endpoint, params = {}) {
    const url = buildOparlUrl(endpoint);
    assertAllowedOparlUrl(url);
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            url.searchParams.set(key, value);
        }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
            throw new OparlRequestError("http", `OParl API Fehler: ${response.status} ${response.statusText}`, response.status);
        }
        return await response.json();
    }
    catch (error) {
        if (error instanceof OparlRequestError) {
            throw error;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new OparlRequestError("timeout", `Zeitüberschreitung nach ${FETCH_TIMEOUT_MS / 1000} Sekunden.`);
        }
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        throw new OparlRequestError("network", `Netzwerkfehler: ${message}`);
    }
    finally {
        clearTimeout(timeoutId);
    }
}
function simplifyMeeting(meeting) {
    return {
        id: meeting.id,
        name: meeting.name,
        start: meeting.start,
        end: meeting.end,
        location: typeof meeting.location === "object"
            ? meeting.location?.description
            : meeting.location,
        organization: meeting.organization?.[0],
    };
}
function simplifyPaper(paper) {
    return {
        id: paper.id,
        name: paper.name,
        reference: paper.reference,
        date: paper.date,
        type: paper.paperType,
        mainFileUrl: paper.mainFile?.accessUrl,
    };
}
function simplifyPerson(person) {
    return {
        id: person.id,
        name: person.name,
        party: person.membership?.[0]?.organization,
    };
}
function simplifyOrganization(organization) {
    return {
        id: organization.id,
        name: organization.name,
        type: organization.organizationType,
    };
}
const TOOLS = [
    {
        name: "search_meetings",
        description: "Search for council meetings (Sitzungen). Useful to find dates, agendas, or locations.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search term for the meeting title",
                },
                minDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                maxDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                page: {
                    type: "number",
                    description: "Optional page number (1-based, default 1)",
                },
                limit: {
                    type: "number",
                    description: "Optional page size (default 25, max 100)",
                },
            },
        },
    },
    {
        name: "search_papers",
        description: "Search for parliamentary papers (Vorlagen, Anträge, Beschlüsse).",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search term (e.g. 'Cycle path', 'School')",
                },
                type: {
                    type: "string",
                    enum: ["Antrag", "Anfrage", "Mitteilung", "Beschlussvorlage"],
                    description: "Type of paper",
                },
                page: {
                    type: "number",
                    description: "Optional page number (1-based, default 1)",
                },
                limit: {
                    type: "number",
                    description: "Optional page size (default 25, max 100)",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "search_organizations",
        description: "Search for committees or political groups (Gremien).",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Name of the organization" },
                page: {
                    type: "number",
                    description: "Optional page number (1-based, default 1)",
                },
                limit: {
                    type: "number",
                    description: "Optional page size (default 25, max 100)",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "search_people",
        description: "Search for council members or people.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Name of the person" },
                page: {
                    type: "number",
                    description: "Optional page number (1-based, default 1)",
                },
                limit: {
                    type: "number",
                    description: "Optional page size (default 25, max 100)",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "get_details",
        description: "Retrieve full details for a specific resource using its ID/URL found in search results.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The full ID URL of the resource" },
            },
            required: ["url"],
        },
    },
];
const server = new Server({
    name: "oparl-koeln-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS,
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args ?? {});
    try {
        console.error(`[MCP] Call Tool: ${name}`, JSON.stringify(safeArgs));
        if (name === "search_meetings") {
            const query = normalizeQuery(safeArgs.query);
            const minDate = typeof safeArgs.minDate === "string" && safeArgs.minDate.trim()
                ? safeArgs.minDate.trim()
                : undefined;
            const maxDate = typeof safeArgs.maxDate === "string" && safeArgs.maxDate.trim()
                ? safeArgs.maxDate.trim()
                : undefined;
            const pagination = normalizePagination(safeArgs);
            const payload = await fetchOparl("meetings", {
                limit: String(FETCH_PAGE_SIZE),
                sort: "start",
            });
            const filtered = readDataArray(payload)
                .filter((meeting) => {
                const location = typeof meeting?.location === "object"
                    ? meeting?.location?.description
                    : meeting?.location;
                return includesAnyField(query, [
                    meeting?.name,
                    location,
                    meeting?.organization?.[0],
                ]);
            })
                .filter((meeting) => matchesDateRange(meeting?.start, minDate, maxDate))
                .sort((a, b) => String(a?.start ?? "").localeCompare(String(b?.start ?? "")))
                .map(simplifyMeeting);
            const result = paginate(filtered, pagination.page, pagination.limit);
            console.error(`[MCP] Meetings filtered=${filtered.length}, returned=${result.length}`);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        if (name === "search_papers") {
            const query = normalizeQuery(safeArgs.query);
            const typeFilter = typeof safeArgs.type === "string" ? safeArgs.type.trim().toLowerCase() : "";
            const pagination = normalizePagination(safeArgs);
            const payload = await fetchOparl("papers", {
                limit: String(FETCH_PAGE_SIZE),
                sort: "-date",
            });
            const filtered = readDataArray(payload)
                .filter((paper) => includesAnyField(query, [paper?.name, paper?.reference, paper?.paperType]))
                .filter((paper) => {
                if (!typeFilter) {
                    return true;
                }
                const paperType = String(paper?.paperType ?? "").toLowerCase();
                return paperType.includes(typeFilter);
            })
                .sort((a, b) => String(b?.date ?? "").localeCompare(String(a?.date ?? "")))
                .map(simplifyPaper);
            const result = paginate(filtered, pagination.page, pagination.limit);
            console.error(`[MCP] Papers filtered=${filtered.length}, returned=${result.length}`);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        if (name === "search_organizations") {
            const query = normalizeQuery(safeArgs.query);
            const pagination = normalizePagination(safeArgs);
            const payload = await fetchOparl("organizations", {
                limit: String(FETCH_PAGE_SIZE),
            });
            const filtered = readDataArray(payload)
                .filter((org) => includesAnyField(query, [
                org?.name,
                org?.shortName,
                org?.classification,
                org?.organizationType,
            ]))
                .sort((a, b) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")))
                .map(simplifyOrganization);
            const result = paginate(filtered, pagination.page, pagination.limit);
            console.error(`[MCP] Organizations filtered=${filtered.length}, returned=${result.length}`);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        if (name === "search_people") {
            const query = normalizeQuery(safeArgs.query);
            const pagination = normalizePagination(safeArgs);
            const payload = await fetchOparl("people", {
                limit: String(FETCH_PAGE_SIZE),
            });
            const filtered = readDataArray(payload)
                .filter((person) => includesAnyField(query, [
                person?.name,
                person?.givenName,
                person?.familyName,
            ]))
                .sort((a, b) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")))
                .map(simplifyPerson);
            const result = paginate(filtered, pagination.page, pagination.limit);
            console.error(`[MCP] People filtered=${filtered.length}, returned=${result.length}`);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        if (name === "get_details") {
            const url = typeof safeArgs.url === "string" ? safeArgs.url : "";
            const data = await fetchOparl(url);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (error) {
        console.error(`[MCP] Error in ${name}:`, error);
        const message = error instanceof OparlRequestError
            ? error.message
            : error instanceof Error
                ? error.message
                : "Unbekannter Fehler";
        return {
            content: [
                {
                    type: "text",
                    text: `Error executing ${name}: ${message}\nIf the search failed, try simpler terms or check available parameters.`,
                },
            ],
            isError: true,
        };
    }
});
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("OParl Köln MCP Server running on stdio...");
}
run().catch((error) => {
    console.error("Fatal error starting server:", error);
    process.exit(1);
});
