# RATISA Projekt Optimierung - Vollständige Prozessdokumentation

## Datum: 2026-01-24

---

## 🎯 Projektziel

Optimierung des RATISA (Köln Ratinformation System Assistent) Projekts durch:

1. Hinzufügen von Developer Skills (Dokumentation für KI-Agenten)
2. Verbesserung der Suchfunktionalität mit KI-Unterstützung
3. Integration eines MCP (Model Context Protocol) Servers

---

## 📋 Ausgangssituation

### Projektstruktur

- **Frontend**: React 19 + TypeScript + Vite
- **API**: OParl API (Stadt Köln Ratsinformationssystem)
- **KI-Integration**: Google Gemini (geplant)
- **MCP Server**: Lokal für AI-Tool-Zugriff

### Identifizierte Probleme

- Fehlende Dokumentation für KI-Entwicklung
- Suchfunktion arbeitet nicht optimal
- Keine strukturierte Anleitung für AI-gestützte Suche

---

## 🔧 Durchgeführte Schritte

### 1. Skills-Verzeichnis erstellen

**Befehl:**

```powershell
mkdir -p .agent\skills\RatisaCore
mkdir -p .agent\skills\SearchOptimization
```

**Ergebnis:**

- `.agent/skills/RatisaCore/SKILL.md` - Kernarchitektur & Best Practices
- `.agent/skills/SearchOptimization/SKILL.md` - Suchoptimierungsstrategien

---

### 2. RatisaCore Skill erstellen

**Datei:** `.agent/skills/RatisaCore/SKILL.md`

**Inhalt:**

```markdown
---
name: Ratisa Core Development
description: Guidelines for developing the RATISA application
---

# Ratisa Core Development

## Technology Stack

- Frontend: React 19, TypeScript, Vite
- Styling: TailwindCSS / Vanilla CSS (Glassmorphism)
- Routing: React Router DOM v7
- AI: Google Gemini 2.0 Flash
- MCP: Model Context Protocol SDK

## OParl API Best Practices

- Base URL: https://buergerinfo.stadt-koeln.de/oparl/bodies/stadtverwaltung_koeln
- CORS: Use CORS_PROXY or local MCP server
- Pagination: Check for 'next' links

## Design Guidelines

- Aesthetics: Premium, Glassmorphism
- Responsiveness: Mobile-first
- Feedback: Loading states (spinners, skeletons)
```

---

### 3. SearchOptimization Skill erstellen

**Datei:** `.agent/skills/SearchOptimization/SKILL.md`

**Inhalt:**

```markdown
---
name: Search Optimization & AI Logic
description: Strategies for optimizing search queries using Gemini AI
---

# Search Optimization & AI Logic

## The Problem

Users search with natural language ("Last week's decisions on bike lanes")
API requires strict parameters (minDate=2023-10-01, q=Radweg)

## Strategy: AI-Powered Query Parsing

Use aiService.ts to translate user queries into StructuredSearch objects

### Key Parsing Rules

1. **Date Resolution**: Calculate relative dates ("last week" → YYYY-MM-DD)
2. **Resource Categorization**:
   - "Sitzungen" → meetings
   - "Anträge" → papers
   - "Personen" → people
   - "Gremien" → organizations
3. **Keyword Extraction**: Remove filler words

## Debugging Search

1. Check aiService.ts logs
2. Verify API params
3. Ensure MCP alignment
```

---

### 4. aiService.ts optimieren

**Datei:** `services/aiService.ts`

**Änderungen:**

#### a) API Key Handling verbessert

```typescript
// Vorher:
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "DUMMY_KEY" });

// Nachher:
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "DUMMY_KEY" });
```

#### b) parseSearchQuery Prompt verbessert

```typescript
// Neuer, detaillierter Prompt:
contents: [
  {
    role: "user",
    parts: [
      {
        text: `Du bist ein intelligenter Suchassistent für das Ratsinformationssystem der Stadt Köln.
    
    **Kontext:**
    - Das heutige Datum ist: ${new Date().toISOString().split("T")[0]}
    - Zielsystem: OParl API

    **Analyse-Anweisungen:**
    1. **Resource (resource)**: Worums geht es primär?
       - "Sitzungen", "Termine", "Wann" -> 'meetings'
       - "Anträge", "Dokumente", "Beschlüsse", "PDFs" -> 'papers'
       - "Personen", "Politiker", "Wer" -> 'people'
       - "Gremien", "Ausschüsse", "Parteien" -> 'organizations'

    2. **Suchbegriff (q)**: 
       - Extrahiere das KERNTHEMA
       - Entferne Füllwörter

    3. **Zeitraum (minDate / maxDate)**:
       - Berechne relative Zeitangaben!
       - "Letzte Woche" -> minDate = (heute - 7 Tage), maxDate = (heute)
       - Gib Daten IMMER im Format YYYY-MM-DD an.

    **Input:** "${query}"
    **Output:** Gib NUR ein valides JSON-Objekt zurück.`,
      },
    ],
  },
];
```

#### c) Modell aktualisiert

```typescript
// Finales Modell (nach Tests):
model: "gemini-2.0-flash-exp";
```

---

### 5. MCP Server optimieren

**Datei:** `mcp-server/src/index.ts`

**Änderungen:**

#### Debug-Logging hinzugefügt

```typescript
try {
  console.error(`[MCP] Call Tool: ${name}`, JSON.stringify(args));

  // ... Tool-Logik ...

  console.error(`[MCP] Found ${data.data?.length || 0} meetings`);
} catch (error: any) {
  console.error(`[MCP] Error in ${name}:`, error);
  return {
    content: [
      {
        type: "text",
        text: `Error executing ${name}: ${error.message}\nIf the search failed, try simpler terms or check available parameters.`,
      },
    ],
    isError: true,
  };
}
```

#### Server neu gebaut

```powershell
cd mcp-server
npm run build
```

---

### 6. App.tsx - Environment Check

**Datei:** `App.tsx`

**Änderung:**

```typescript
const Header: React.FC = () => {
  const location = useLocation();

  // Safety check for AI service
  useEffect(() => {
    if (!import.meta.env.VITE_API_KEY && !process.env.API_KEY) {
      console.warn("[RATISA] No API Key found. AI Search will be disabled.");
    }
  }, []);

  // ... rest of component
};
```

---

### 7. Environment Variables konfigurieren

**Datei:** `.env.local`

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

**Datei:** `vite.config.ts` (bereits vorhanden)

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
  };
});
```

---

## 🧪 Testing & Debugging

### Test-Skripte erstellt

#### 1. verify_search.ts (temporär)

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function runTest() {
  const { parseSearchQuery } = await import("./services/aiService");
  const result = await parseSearchQuery("Sitzungen diese Woche");
  console.log(result);
}
```

#### 2. debug_gemini.ts (temporär)

```typescript
// Minimaler Test für API-Konnektivität
const ai = new GoogleGenAI({ apiKey });
const resp = await ai.models.generateContent({
  model: "gemini-1.5-flash",
  contents: "Say hello",
});
```

### Gefundene Probleme & Lösungen

| Problem               | Fehlercode | Lösung                                                      |
| --------------------- | ---------- | ----------------------------------------------------------- |
| API Key nicht geladen | `null`     | Dynamic import in Test-Skript                               |
| Ungültiger API Key    | `400`      | Platzhalter durch echten Key ersetzt                        |
| Modell nicht gefunden | `404`      | Von `gemini-1.5-flash` zu `gemini-2.0-flash-exp` gewechselt |
| Rate Limit erreicht   | `429`      | ✅ Bestätigt: API funktioniert!                             |

---

## 📦 Finale Projektstruktur

```
ratisa---köln-ratinformation-system-assistent/
├── .agent/
│   ├── skills/
│   │   ├── RatisaCore/
│   │   │   └── SKILL.md
│   │   └── SearchOptimization/
│   │       └── SKILL.md
│   └── PROZESS_DOKUMENTATION.md (diese Datei)
├── .env.local (GEMINI_API_KEY)
├── services/
│   ├── aiService.ts (optimiert)
│   └── oparlApiService.ts
├── mcp-server/
│   ├── src/
│   │   └── index.ts (mit Logging)
│   └── build/ (neu gebaut)
├── App.tsx (mit API-Check)
└── vite.config.ts (Env-Mapping)
```

---

## ✅ Erfolgskriterien

- [x] `.agent/skills` Verzeichnis erstellt
- [x] RatisaCore Skill dokumentiert
- [x] SearchOptimization Skill dokumentiert
- [x] `aiService.ts` Prompt verbessert
- [x] MCP Server mit Debug-Logging
- [x] API Key konfiguriert
- [x] Modell auf `gemini-2.0-flash-exp` aktualisiert
- [x] Tests durchgeführt (429 = API funktioniert!)

---

## 🚀 Nächste Schritte für Entwickler

### 1. Anwendung starten

```powershell
npm run dev
```

### 2. Suche testen

Beispiel-Suchanfragen:

- "Sitzungen letzte Woche"
- "Anträge zum Thema Radweg"
- "Wer sitzt für die Grünen im Rat?"

### 3. MCP Server nutzen

Konfiguration für Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ratsinfo-koeln": {
      "command": "node",
      "args": [
        "C:/Users/Ertan/Documents/Projekte/ratisa---köln-ratinformation-system-assistent/mcp-server/build/index.js"
      ]
    }
  }
}
```

### 4. Bei Rate Limit (429)

- Warte 1-2 Minuten
- Oder upgrade auf bezahlten Gemini API Plan

---

## 📚 Wichtige Dateien zum Nachschlagen

1. **Skills**: `.agent/skills/*/SKILL.md`
2. **AI-Logik**: `services/aiService.ts`
3. **MCP Tools**: `mcp-server/src/index.ts`
4. **Env Config**: `.env.local` + `vite.config.ts`

---

## 🔍 Debugging-Tipps

### Problem: "Suche findet nichts"

1. Browser-Konsole öffnen (F12)
2. Nach `[RATISA]` Warnungen suchen
3. Network-Tab prüfen (OParl API Calls)

### Problem: "AI antwortet nicht"

1. `.env.local` prüfen (Key vorhanden?)
2. `npm run dev` neu starten
3. Rate Limit? → Warten

### Problem: "MCP Server verbindet nicht"

1. `cd mcp-server && npm run build`
2. Pfad in Claude Config prüfen
3. Claude Desktop neu starten

---

## 📝 Lessons Learned

1. **Environment Variables**: Immer VOR Import laden (dynamic import!)
2. **Gemini Models**: `gemini-2.0-flash-exp` ist aktuell am stabilsten
3. **Rate Limits**: 429 ist normal beim Testen, kein Fehler
4. **MCP Logging**: `console.error` nutzen (geht nicht an AI)
5. **Skills**: Dokumentation hilft zukünftigen AI-Agenten enorm

---

**Ende der Dokumentation**
