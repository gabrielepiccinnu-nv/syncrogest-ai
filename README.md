# Syncrogest AI

Assistente conversazionale per la gestione del gestionale Syncrogest. Permette di interrogare e operare su interventi, ticket, preventivi, clienti e CRM tramite linguaggio naturale in italiano.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Claude Sonnet 4.6** / **DeepSeek Chat** — selezionabili a runtime
- **TailwindCSS** — UI
- **Syncrogest REST API** — backend gestionale

## Funzionalità

- Chat in italiano: l'utente descrive cosa vuole fare, l'AI interpreta e agisce
- Operazioni di lettura eseguite automaticamente (calendario, clienti, interventi, ticket, preventivi, opportunità)
- Operazioni di scrittura con preview e conferma esplicita prima dell'esecuzione
- Dual AI engine: Claude (ragionamento avanzato) o DeepSeek (alternativa economica)
- Sintesi risultati in linguaggio naturale, niente JSON raw

## API Syncrogest coperte

| Modulo | Operazioni principali |
|---|---|
| `ws_common` | Calendario, ricerca clienti, info azienda |
| `ws_ticket` | Lista, crea, aggiorna ticket; note, stati, priorità, categorie |
| `ws_interventi` | Lista, crea, aggiorna, chiudi interventi; attività, prodotti, staff, PDF, email |
| `ws_preventivi` | Cerca, visualizza, cambia stato, genera PDF |
| `ws_opportunita` | Cerca opportunità CRM, crea trattative ed eventi (MEETING, CALL, QUOTE, EMAIL) |
| `ws_commesse` | Ricerca commesse per cliente |

40+ tool definitions mappati su endpoint Syncrogest.

## Struttura

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── chat/route.ts          # Endpoint AI: interpreta messaggio → tool calls
│       └── syncrogest/route.ts    # Endpoint esecuzione tool confermati
├── components/
│   ├── ChatInterface.tsx
│   ├── MessageBubble.tsx
│   ├── MessageList.tsx
│   ├── ModelSelector.tsx
│   ├── PreviewCard.tsx
│   └── ResultCard.tsx
├── hooks/
│   └── useChat.ts
└── lib/
    ├── ai/
    │   ├── claudeClient.ts        # Client Claude con prompt caching
    │   ├── deepseekClient.ts      # Client DeepSeek (formato OpenAI-compat)
    │   ├── toolDefinitions.ts     # 40+ tool definitions
    │   ├── readTools.ts           # Set tool auto-eseguibili
    │   └── systemPrompt.ts        # System prompt con pattern multi-step
    ├── syncrogest/
    │   ├── auth.ts                # Login + token cache 55min
    │   ├── client.ts              # HTTP client base
    │   └── executor.ts            # Mappatura tool → endpoint + trasformazioni
    └── types/
        ├── chat.ts
        ├── syncrogest.ts
        └── tools.ts
```

## Setup

```bash
npm install
```

Copia `.env.example` in `.env.local` e compila le variabili:

```bash
cp .env.example .env.local
```

```env
ANTHROPIC_API_KEY=      # Per Claude
DEEPSEEK_API_KEY=       # Per DeepSeek

WP_API_KEY=             # Syncrogest WebSocket API key
WS_API_KEY=             # Syncrogest WS API key

SYNCROGEST_USERNAME=    # Credenziali accesso Syncrogest
SYNCROGEST_PASSWORD=
```

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Flusso conversazionale

```
Utente → messaggio in italiano
  ↓
/api/chat — AI interpreta, esegue tool lettura automaticamente (max 10 step)
  ↓
  ├── Tool lettura: esegue e continua il ragionamento
  └── Tool scrittura: restituisce preview alla UI
        ↓
     Utente conferma → /api/syncrogest esegue + sintetizza risultato
```

## Note tecniche

- Il system prompt è cachato (Claude prompt caching) per ridurre latency e costi
- La data odierna è iniettata nel messaggio, non nel system prompt cachato
- Il token Syncrogest viene cachato lato server per 55 minuti
- `get_ore_tecnico` aggrega le ore tecnico da più chiamate API
- Operazioni scrittura richiedono sempre conferma esplicita dall'utente
