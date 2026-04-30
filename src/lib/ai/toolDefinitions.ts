import type Anthropic from '@anthropic-ai/sdk';

type CacheableTool = Anthropic.Tool & {
  cache_control?: { type: 'ephemeral' };
};

export const SYNCROGEST_TOOLS: CacheableTool[] = [
  // ws_common
  {
    name: 'get_calendario',
    description:
      'Recupera il calendario degli appuntamenti/interventi per un intervallo di date. Usare quando l\'utente chiede "cosa c\'è in agenda", "appuntamenti di questa settimana", "calendario del mese".',
    input_schema: {
      type: 'object' as const,
      properties: {
        data_inizio: { type: 'string', description: 'Data inizio yyyy-mm-dd' },
        data_fine: { type: 'string', description: 'Data fine yyyy-mm-dd' },
      },
      required: ['data_inizio', 'data_fine'],
    },
  },
  {
    name: 'search_clienti',
    description:
      'Cerca clienti per nome o ragione sociale. Usare quando l\'utente menziona un nome cliente e serve trovare il suo ID numerico prima di creare un intervento o ticket.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Nome o ragione sociale del cliente' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_clienti',
    description: 'Lista tutti i clienti con paginazione. Usare per "lista clienti" o "tutti i clienti".',
    input_schema: {
      type: 'object' as const,
      properties: {
        num: { type: 'number', description: 'Numero risultati, massimo 400' },
        offset: { type: 'number', description: 'Offset paginazione' },
      },
      required: [],
    },
  },
  {
    name: 'get_company_info',
    description: 'Recupera informazioni sull\'azienda (nome, indirizzo, contatti).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ws_ticket
  {
    name: 'list_tickets',
    description:
      'Lista i ticket di assistenza con filtri opzionali. Usare per "mostra ticket aperti", "ticket del cliente X", "ticket urgenti".',
    input_schema: {
      type: 'object' as const,
      properties: {
        num: { type: 'number' },
        offset: { type: 'number' },
        id_cliente: { type: 'number', description: 'Filtra per ID cliente' },
        id_stato: { type: 'number', description: 'Filtra per stato' },
        id_priorita: { type: 'number', description: 'Filtra per priorità' },
      },
      required: [],
    },
  },
  {
    name: 'create_ticket',
    description:
      'Crea un nuovo ticket di assistenza. Richiede ID cliente (cercarlo prima con search_clienti se non noto), oggetto e descrizione.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_cliente: { type: 'number', description: 'ID numerico del cliente' },
        oggetto: { type: 'string', description: 'Titolo/oggetto del ticket' },
        descrizione: { type: 'string', description: 'Descrizione del problema' },
        id_priorita: { type: 'number', description: 'ID priorità' },
        id_stato: { type: 'number', description: 'ID stato iniziale' },
        id_categoria: { type: 'number', description: 'ID categoria' },
      },
      required: ['id_cliente', 'oggetto', 'descrizione'],
    },
  },
  {
    name: 'update_ticket',
    description: 'Aggiorna un ticket esistente (stato, priorità, descrizione).',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_ticket: { type: 'number', description: 'ID del ticket da aggiornare' },
        id_stato: { type: 'number' },
        id_priorita: { type: 'number' },
        descrizione: { type: 'string' },
        oggetto: { type: 'string' },
      },
      required: ['id_ticket'],
    },
  },
  {
    name: 'get_ticket_states',
    description: 'Recupera la lista degli stati disponibili per i ticket.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_ticket_priorities',
    description: 'Recupera la lista delle priorità disponibili per i ticket.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_ticket_categories',
    description: 'Recupera le categorie disponibili per i ticket.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'add_ticket_note',
    description: 'Aggiunge una nota a un ticket esistente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_ticket: { type: 'number' },
        testo: { type: 'string', description: 'Testo della nota' },
        pubblica: { type: 'boolean', description: 'Se true è visibile al cliente' },
      },
      required: ['id_ticket', 'testo'],
    },
  },
  {
    name: 'get_ticket_notes',
    description: 'Recupera le note di un ticket.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_ticket: { type: 'number' },
      },
      required: ['id_ticket'],
    },
  },

  // ws_interventi
  {
    name: 'list_interventi',
    description:
      'Lista gli interventi (ordini di lavoro) con filtri. Usare per "mostra interventi", "interventi di questa settimana", "ordini aperti", "ore di un tecnico".',
    input_schema: {
      type: 'object' as const,
      properties: {
        num: { type: 'number' },
        offset: { type: 'number' },
        data_da: { type: 'string', description: 'Data inizio yyyy-mm-dd' },
        data_a: { type: 'string', description: 'Data fine yyyy-mm-dd' },
        id_cliente: { type: 'number' },
        id_stato: { type: 'number' },
        addetto_uid: { type: 'number', description: 'Filtra per ID tecnico/addetto assegnato' },
        years: { type: 'string', description: 'Anni da cercare es. "2025,2024"' },
      },
      required: [],
    },
  },
  {
    name: 'get_intervento',
    description: 'Recupera i dettagli completi di un singolo intervento tramite il suo ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_intervento: { type: 'number' },
      },
      required: ['id_intervento'],
    },
  },
  {
    name: 'create_intervento',
    description:
      'Crea un nuovo intervento/ordine di lavoro sul calendario. Richiede ID cliente (cercarlo prima con search_clienti se non noto), data e descrizione. Supporta fasce orarie e assegnazione tecnici.',
    input_schema: {
      type: 'object' as const,
      properties: {
        intervento_cliente_id: { type: 'number', description: 'ID numerico del cliente' },
        intervento_data: { type: 'string', description: 'Data in formato dd/MM/yyyy' },
        intervento_descrizione: { type: 'string', description: 'Descrizione lavoro da eseguire' },
        intervento_stato_id: { type: 'number' },
        intervento_priorita_id: { type: 'number' },
        intervento_categoria_id: { type: 'number' },
        intervento_commessa_id: { type: 'number', description: 'ID progetto/commessa (opzionale)' },
        intervento_matt_da: { type: 'string', description: 'Ora inizio mattina HH:MM (es. "09:00")' },
        intervento_matt_a: { type: 'string', description: 'Ora fine mattina HH:MM (es. "12:30")' },
        intervento_pome_da: { type: 'string', description: 'Ora inizio pomeriggio HH:MM (es. "14:00")' },
        intervento_pome_a: { type: 'string', description: 'Ora fine pomeriggio HH:MM (es. "18:00")' },
        intervento_utenti_utente_id: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array ID tecnici da assegnare (es. [4424, 123])',
        },
        intervento_localita: { type: 'string', description: 'Luogo / indirizzo intervento' },
      },
      required: ['intervento_cliente_id', 'intervento_data', 'intervento_descrizione'],
    },
  },
  {
    name: 'update_intervento',
    description: 'Aggiorna un intervento esistente (data, descrizione, stato, fasce orarie, tecnici).',
    input_schema: {
      type: 'object' as const,
      properties: {
        intervento_id: { type: 'number', description: 'ID intervento da aggiornare' },
        intervento_cliente_id: { type: 'number' },
        intervento_data: { type: 'string', description: 'dd/MM/yyyy' },
        intervento_descrizione: { type: 'string' },
        intervento_stato_id: { type: 'number' },
        intervento_priorita_id: { type: 'number' },
        intervento_matt_da: { type: 'string', description: 'Ora inizio mattina HH:MM' },
        intervento_matt_a: { type: 'string', description: 'Ora fine mattina HH:MM' },
        intervento_pome_da: { type: 'string', description: 'Ora inizio pomeriggio HH:MM' },
        intervento_pome_a: { type: 'string', description: 'Ora fine pomeriggio HH:MM' },
        intervento_utenti_utente_id: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array ID tecnici assegnati',
        },
      },
      required: ['intervento_id'],
    },
  },
  {
    name: 'close_intervento',
    description: 'Chiude un intervento impostando lo stato a completato.',
    input_schema: {
      type: 'object' as const,
      properties: {
        intervento_id: { type: 'number', description: 'ID intervento da chiudere' },
        intervento_descrizione: { type: 'string', description: 'Note di chiusura opzionali' },
      },
      required: ['intervento_id'],
    },
  },
  {
    name: 'add_activity_to_intervento',
    description: 'Aggiunge un\'attività (ore di lavoro) a un intervento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_intervento: { type: 'number' },
        id_attivita: { type: 'number', description: 'ID tipo attività' },
        ore: { type: 'number', description: 'Ore lavorate' },
        minuti: { type: 'number', description: 'Minuti aggiuntivi' },
        descrizione: { type: 'string' },
        data: { type: 'string', description: 'dd/MM/yyyy' },
      },
      required: ['id_intervento', 'id_attivita', 'ore', 'data'],
    },
  },
  {
    name: 'add_product_to_intervento',
    description: 'Aggiunge un prodotto/materiale a un intervento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_intervento: { type: 'number' },
        id_prodotto: { type: 'number' },
        quantita: { type: 'number' },
        prezzo: { type: 'number', description: 'Prezzo unitario (opzionale)' },
        descrizione: { type: 'string' },
      },
      required: ['id_intervento', 'id_prodotto', 'quantita'],
    },
  },
  {
    name: 'assign_staff_to_intervento',
    description: 'Assegna un tecnico a un intervento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_intervento: { type: 'number' },
        id_utente: { type: 'number', description: 'ID del tecnico' },
      },
      required: ['id_intervento', 'id_utente'],
    },
  },
  {
    name: 'get_intervento_activities',
    description: 'Lista le attività registrate su un intervento.',
    input_schema: {
      type: 'object' as const,
      properties: { id_intervento: { type: 'number' } },
      required: ['id_intervento'],
    },
  },
  {
    name: 'get_intervento_products',
    description: 'Lista i prodotti/materiali utilizzati in un intervento.',
    input_schema: {
      type: 'object' as const,
      properties: { id_intervento: { type: 'number' } },
      required: ['id_intervento'],
    },
  },
  {
    name: 'get_intervento_staff',
    description: 'Lista il personale assegnato a un intervento.',
    input_schema: {
      type: 'object' as const,
      properties: { id_intervento: { type: 'number' } },
      required: ['id_intervento'],
    },
  },
  {
    name: 'generate_pdf_intervento',
    description: 'Genera il PDF del rapporto di intervento.',
    input_schema: {
      type: 'object' as const,
      properties: { id_intervento: { type: 'number' } },
      required: ['id_intervento'],
    },
  },
  {
    name: 'send_email_intervento',
    description: 'Invia via email il rapporto dell\'intervento al cliente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_intervento: { type: 'number' },
        email: { type: 'string', description: 'Email destinatario' },
        oggetto: { type: 'string', description: 'Oggetto email' },
        testo: { type: 'string', description: 'Corpo email' },
      },
      required: ['id_intervento'],
    },
  },
  {
    name: 'get_staff_list',
    description: 'Recupera la lista del personale/tecnici disponibili.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_intervento_states',
    description: 'Recupera la lista degli stati disponibili per gli interventi.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_intervento_categories',
    description: 'Recupera le categorie disponibili per gli interventi.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  // Last tool gets cache_control — caches the entire tools array
  {
    name: 'get_ticket_from_intervento',
    description: 'Recupera il ticket collegato a un intervento specifico.',
    input_schema: {
      type: 'object' as const,
      properties: { id_intervento: { type: 'number' } },
      required: ['id_intervento'],
    },
  },

  // ws_opportunita
  {
    name: 'search_opportunita',
    description:
      'Cerca opportunità CRM per cliente. Usare per trovare opportunità aperte a cui collegare eventi.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cliente_id: { type: 'number', description: 'ID cliente' },
        find: { type: 'string', description: 'Ricerca per nome cliente' },
        stato_id: { type: 'string', description: 'Filtra per stato opportunità' },
      },
      required: [],
    },
  },
  {
    name: 'create_opportunita',
    description:
      'Crea una nuova opportunità CRM per un cliente. Usare per creare una trattativa/lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunita_cliente_id: { type: 'number', description: 'ID cliente (obbligatorio)' },
        opportunita_titolo: { type: 'string', description: 'Titolo/descrizione opportunità (obbligatorio)' },
        opportunita_fonte_id: { type: 'string', description: 'Fonte (PASSAPAROLA, SITO WEB, etc.)' },
        opportunita_descrizione: { type: 'string', description: 'Descrizione dettagliata' },
        opportunita_addetto_id: { type: 'number', description: 'ID utente responsabile della trattativa (obbligatorio — usare get_staff_list se non noto)' },
      },
      required: ['opportunita_cliente_id', 'opportunita_titolo', 'opportunita_addetto_id'],
    },
  },
  {
    name: 'create_evento_crm',
    description:
      'Crea un evento/appuntamento CRM legato a una opportunità. Usare per aggiungere appuntamenti su CRM.',
    input_schema: {
      type: 'object' as const,
      properties: {
        evento_opportunita_id: { type: 'number', description: 'ID opportunità a cui collegare (obbligatorio)' },
        evento_nome: { type: 'string', description: 'Titolo evento (obbligatorio)' },
        evento_tipologia: {
          type: 'string',
          description: 'Tipo: MEETING, CALL, EMAIL, QUOTE, REMIND, OTHER (obbligatorio)',
        },
        evento_data: { type: 'string', description: 'Data dd/mm/yyyy (obbligatorio)' },
        evento_dalle_ore: { type: 'string', description: 'Ora inizio HH:MM es. "15:30" (obbligatorio)' },
        evento_alle_ore: { type: 'string', description: 'Ora fine HH:MM es. "16:30"' },
        evento_addetto_id: { type: 'number', description: 'ID tecnico assegnato' },
        evento_location: { type: 'string', description: 'Luogo / indirizzo dell\'evento' },
      },
      required: ['evento_opportunita_id', 'evento_nome', 'evento_tipologia', 'evento_data', 'evento_dalle_ore'],
    },
  },
  {
    name: 'get_eventi_opportunita',
    description: 'Recupera gli eventi/appuntamenti di una specifica opportunità CRM.',
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunita_id: { type: 'number', description: 'ID dell\'opportunità' },
      },
      required: ['opportunita_id'],
    },
  },
  {
    name: 'search_commesse',
    description:
      'Cerca commesse (progetti) per cliente. Usare per trovare progetti a cui collegare interventi.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cliente_id: { type: 'number', description: 'ID cliente (obbligatorio)' },
        find: { type: 'string', description: 'Ricerca per nome' },
        solo_attive: { type: 'number', description: 'Se 1, mostra solo commesse attive' },
      },
      required: ['cliente_id'],
    },
  },
  {
    name: 'get_ore_tecnico',
    description:
      'Calcola le ore totali lavorate da un tecnico in un periodo. Usare per "quante ore ha fatto X questo mese", "ore di lavoro del tecnico Y". Restituisce il totale ore e il dettaglio per intervento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        addetto_uid: { type: 'number', description: 'ID numerico del tecnico (da get_staff_list)' },
        data_da: { type: 'string', description: 'Data inizio yyyy-mm-dd' },
        data_a: { type: 'string', description: 'Data fine yyyy-mm-dd' },
      },
      required: ['addetto_uid', 'data_da', 'data_a'],
    },
  },

  // ws_preventivi
  {
    name: 'search_preventivi',
    description:
      'Cerca preventivi per numero, cliente o data. Usare quando l\'utente chiede "cerca preventivo", "trova preventivo X", "preventivi del cliente Y".',
    input_schema: {
      type: 'object' as const,
      properties: {
        numero_preventivo: { type: 'string', description: 'Numero del preventivo (es. 00007PA)' },
        cliente_id: { type: 'number', description: 'ID del cliente' },
        num: { type: 'number', description: 'Numero di risultati (default 50)' },
        years: { type: 'string', description: 'Anni da cercare (es. "2024,2023,2022")' },
      },
      required: [],
    },
  },
  {
    name: 'get_preventivo',
    description: 'Recupera i dettagli completi di un preventivo tramite il suo ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        documento_id: { type: 'number', description: 'ID numerico del preventivo' },
      },
      required: ['documento_id'],
    },
  },
  {
    name: 'get_preventivo_pdf',
    description: 'Genera il PDF di un preventivo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        documento_id: { type: 'number', description: 'ID numerico del preventivo' },
      },
      required: ['documento_id'],
    },
  },
  {
    name: 'cambia_stato_preventivo',
    description: 'Cambia lo stato di un preventivo (es. da "In attesa" a "Accettato").',
    input_schema: {
      type: 'object' as const,
      properties: {
        documento_id: { type: 'number', description: 'ID numerico del preventivo' },
        stato_id: { type: 'number', description: 'ID del nuovo stato' },
      },
      required: ['documento_id', 'stato_id'],
    },
  },
  {
    name: 'get_stati_preventivi',
    description: 'Recupera la lista degli stati disponibili per i preventivi.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
    cache_control: { type: 'ephemeral' },
  },
];

