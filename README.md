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

## Casi d'uso supportati

### Clienti
- Cercare clienti per nome o ragione sociale
- Elencare tutti i clienti (con paginazione)
- Recuperare gli interventi di un cliente (multi-step: ricerca cliente → lista interventi filtrata per ID)

### Interventi (Ordini di Lavoro)
- Elencare interventi per data, cliente, tecnico o stato
- Creare nuovi interventi con data, fasce orarie, luogo e tecnici assegnati
- Aggiornare interventi esistenti (data, stato, descrizione, orari, tecnici)
- Aggiungere attività (ore lavorate) — richiede il tipo attività dal catalogo Syncrogest
- Aggiungere prodotti/materiali — richiede l'ID prodotto dal catalogo Syncrogest
- Chiudere interventi con note di chiusura opzionali
- Generare il PDF del rapporto di intervento
- Inviare il rapporto via email al cliente

### Ticket
- Elencare ticket per stato, priorità o cliente
- Creare nuovi ticket con oggetto, descrizione, priorità e categoria
- Aggiungere note pubbliche (visibili al cliente) o interne
- Aggiornare stato, priorità e descrizione di un ticket

### Preventivi
- Cercare preventivi per numero documento o cliente
- Visualizzare i dettagli completi di un preventivo
- Generare il PDF di un preventivo
- Cambiare stato (es. da "In attesa" a "Accettato") — richiede prima la lista stati disponibili

### Calendario
- Visualizzare appuntamenti e interventi in un intervallo di date

### CRM / Opportunità
- Cercare opportunità commerciali aperte per cliente
- Creare nuove trattative/opportunità collegate a un cliente
- Creare eventi CRM sull'opportunità: MEETING, CALL, QUOTE, EMAIL, REMIND
- Visualizzare lo storico eventi di un'opportunità
- **Limite**: gli eventi CRM non sono modificabili dopo la creazione (nessun endpoint update nell'API Syncrogest)

### Commesse / Progetti
- Cercare commesse attive per cliente (usato per collegare interventi a un progetto esistente)

### Personale
- Elencare i tecnici disponibili con i loro ID
- Calcolare le ore totali lavorate da un tecnico in un periodo, con dettaglio per intervento

## API Syncrogest coperte

| Modulo | Operazioni principali |
|---|---|
| `ws_common` | Calendario, ricerca clienti, lista clienti, info azienda |
| `ws_ticket` | Lista, crea, aggiorna ticket; note pubbliche/interne, stati, priorità, categorie |
| `ws_interventi` | Lista, crea, aggiorna, chiudi; attività, prodotti, staff, PDF, email; ore tecnico |
| `ws_preventivi` | Cerca, dettagli, cambia stato, genera PDF |
| `ws_opportunita` | Cerca, crea opportunità; crea eventi CRM (MEETING/CALL/QUOTE/EMAIL); storico eventi |
| `ws_commesse` | Ricerca commesse per cliente |

49 tool definitions mappati su endpoint Syncrogest.

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
    │   ├── toolDefinitions.ts     # Tool definitions
    │   ├── readTools.ts           # Set tool auto-eseguibili senza conferma
    │   └── systemPrompt.ts        # System prompt con pattern multi-step
    ├── syncrogest/
    │   ├── auth.ts                # Login + token cache 55min
    │   ├── client.ts              # HTTP client base
    │   └── executor.ts            # Mappatura tool → endpoint + trasformazioni parametri
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
ANTHROPIC_API_KEY=      # Per Claude Sonnet
DEEPSEEK_API_KEY=       # Per DeepSeek Chat

WS_API_KEY=             # Syncrogest WS-API-KEY (header autenticazione API)

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
- La data odierna è iniettata nel messaggio, non nel system prompt cachato, per non invalidare la cache
- Il token Syncrogest viene cachato lato server per 55 minuti
- `get_ore_tecnico` è implementato lato server: aggrega ore da attività embedded negli interventi o, in fallback, da chiamate separate a `attivita_intervento`
- Operazioni di scrittura richiedono sempre conferma esplicita dell'utente prima dell'esecuzione
