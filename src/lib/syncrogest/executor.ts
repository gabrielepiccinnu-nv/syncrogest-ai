import { SyncrogestClient } from './client';
import { getAuthToken } from './auth';
import { getCached, setCached } from './cache';
import { trimResponse } from './trimmer';
import type { SyncrogestToolName } from '../types/tools';
import { READ_TOOLS } from '../ai/readTools';

const TTL_60MIN = 60 * 60 * 1000;
const CACHED_TOOLS = new Set<SyncrogestToolName>([
  'get_staff_list', 'get_ticket_states', 'get_ticket_priorities', 'get_ticket_categories',
  'get_intervento_states', 'get_intervento_categories', 'get_stati_preventivi',
  'get_tipologie_evento_crm',
]);

const ENDPOINT_MAP: Partial<Record<SyncrogestToolName, string>> = {
  // ws_common
  get_calendario:             'ws_common/bacheca_agenda',
  get_clienti:                'ws_clienti/clienti',
  search_clienti:             'ws_clienti/clienti',
  get_company_info:           'ws_common/azienda',
  // ws_ticket
  list_tickets:               'ws_ticket/tickets',
  create_ticket:              'ws_ticket/save_ticket',
  update_ticket:              'ws_ticket/save_ticket',
  get_ticket_states:          'ws_ticket/stati',
  get_ticket_priorities:      'ws_ticket/stati',            // usa stati con tipo priorita
  get_ticket_categories:      'ws_ticket/categorie',
  add_ticket_note:            'ws_ticket/save_nota',
  get_ticket_notes:           'ws_ticket/note',
  // ws_interventi
  list_interventi:            'ws_interventi/interventi',
  get_intervento:             'ws_interventi/intervento',
  create_intervento:          'ws_interventi/insert_intervento',
  update_intervento:          'ws_interventi/update_intervento',
  close_intervento:           'ws_interventi/update_intervento',
  add_activity_to_intervento: 'ws_interventi/insert_attivita',
  add_product_to_intervento:  'ws_interventi/insert_prodotto_intervento',
  assign_staff_to_intervento: 'ws_interventi/save_addetti',
  get_intervento_activities:  'ws_interventi/attivita_intervento',
  get_intervento_products:    'ws_interventi/prodotti_intervento',
  get_intervento_staff:       'ws_interventi/addetti_assegnati',
  get_ticket_from_intervento: 'ws_interventi/intervento',
  generate_pdf_intervento:    'ws_interventi/rapportino_pdf',
  send_email_intervento:      'ws_interventi/send_rapportino_email',
  get_staff_list:             'ws_utenti/utenti',
  get_intervento_states:      'ws_interventi/stati',
  get_intervento_categories:  'ws_interventi/categorie',
  // ws_preventivi
  search_preventivi:          'ws_preventivi/preventivi',
  get_preventivo:             'ws_documenti/documento',
  get_preventivo_pdf:         'ws_documenti/documento',
  cambia_stato_preventivo:    'ws_documenti/cambia_stato',
  get_stati_preventivi:       'ws_documenti/stati',
  create_preventivo:          'ws_documenti/insert_documento',
  // ws_opportunita (CRM)
  search_opportunita:         'ws_opportunita/opportunities',
  get_eventi_opportunita:     'ws_opportunita/eventi',
  create_opportunita:         'ws_opportunita/save_opportunita',
  create_evento_crm:          'ws_opportunita/save_evento',
  // ws_commesse (Projects)
  search_commesse:            'ws_commesse/commesse',
  get_commessa:               'ws_commesse/commessa',
  // ws_prodotti
  search_prodotti:            'ws_prodotti/prodotti',
  // ws_contatti
  get_contatti_cliente:       'ws_contatti/contatti',
  // ws_impianti
  list_impianti:              'ws_impianti/impianti',
  get_impianto:               'ws_impianti/impianto',
  // ws_opportunita extra
  get_tipologie_evento_crm:   'ws_opportunita/tipologie_evento',
};

/**
 * Esegue un tool Syncrogest per nome, applicando le trasformazioni parametri necessarie
 * prima della chiamata API. Il tool `get_ore_tecnico` è gestito interamente lato server
 * (aggregazione da più endpoint) e non segue l'ENDPOINT_MAP.
 */
export async function executeTool(
  toolName: SyncrogestToolName,
  toolInput: Record<string, unknown>,
): Promise<unknown> {
  const token = await getAuthToken();
  const client = new SyncrogestClient();

  // --- Cache lookup per tool statici ---
  if (CACHED_TOOLS.has(toolName)) {
    const cached = getCached(toolName);
    if (cached !== null) return cached;
  }

  // --- Aggregazioni server-side (bypassano ENDPOINT_MAP) ---

  if (toolName === 'get_scheda_cliente') {
    const id = Number(toolInput.cliente_id);
    const now = new Date();
    const da = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()).toISOString().split('T')[0];
    const a  = now.toISOString().split('T')[0];
    const [contatti, interventi, commesse, preventivi, opportunita] = await Promise.all([
      client.post<Record<string,unknown>>('ws_contatti/contatti',        { token_uid: token, anagrafica_id: id }),
      client.post<Record<string,unknown>>('ws_interventi/interventi',    { token_uid: token, id_cliente: id, num: 8, data_da: da, data_a: a }),
      client.post<Record<string,unknown>>('ws_commesse/commesse',        { token_uid: token, cliente_id: id, solo_attive: 1 }),
      client.post<Record<string,unknown>>('ws_preventivi/preventivi',    { token_uid: token, cliente_id: id, num: 6 }),
      client.post<Record<string,unknown>>('ws_opportunita/opportunities',{ token_uid: token, cliente_id: id }),
    ]);
    return {
      contatti: ((contatti as {data?:{contatti?:Record<string,unknown>[]}}).data?.contatti ?? []).slice(0,5).map((c) => ({
        nome: `${c.contatto_nome ?? ''} ${c.contatto_cognome ?? ''}`.trim(),
        email: c.contatto_email, tel: c.contatto_telefono, ruolo: c.contatto_ruolo,
      })),
      interventi_recenti: ((interventi as {data?:{interventi?:Record<string,unknown>[]}}).data?.interventi ?? []).slice(0,6).map((iv) => ({
        id: iv.intervento_id, data: iv.intervento_data,
        descrizione: iv.intervento_descrizione_clean, stato: iv.intervento_stato_nome,
        tecnico: `${iv.incaricato_nome ?? ''} ${iv.incaricato_cognome ?? ''}`.trim(),
        ore: iv.intervento_durata,
      })),
      commesse_attive: ((commesse as {data?:{commesse?:Record<string,unknown>[]}}).data?.commesse ?? []).map((c) => ({
        id: c.commessa_id, titolo: c.commessa_titolo, stato: c.commessa_stato_nome,
      })),
      preventivi_recenti: ((preventivi as {data?:{preventivi?:Record<string,unknown>[]}}).data?.preventivi ?? []).slice(0,5).map((p) => ({
        numero: p.fattura_numero, oggetto: p.fattura_oggetto,
        totale: p.fattura_totale_iva, stato: p.stato_nome, data: p.fattura_data,
      })),
      trattative_aperte: ((opportunita as {data?:{opportunita?:Record<string,unknown>[]}}).data?.opportunita ?? []).map((o) => ({
        id: o.opportunita_id, contatore: o.opportunita_contatore, titolo: o.opportunita_titolo,
      })),
    };
  }

  if (toolName === 'get_report_periodo') {
    const { data_da, data_a } = toolInput as { data_da: string; data_a: string };
    const resp = await client.post<Record<string,unknown>>('ws_interventi/interventi', { token_uid: token, data_da, data_a, num: 400 });
    const lista = ((resp as {data?:{interventi?:Record<string,unknown>[]}}).data?.interventi ?? []);
    const orePerTecnico = new Map<string, { ore: number; n: number }>();
    const orePerCliente = new Map<string, number>();
    let totale = 0, chiusi = 0, aperti = 0;
    const daCompletare: Record<string,unknown>[] = [];
    for (const iv of lista) {
      totale++;
      const stato = String(iv.intervento_stato_nome ?? '').toLowerCase();
      if (stato.includes('chius') || stato.includes('complet')) { chiusi++; }
      else {
        aperti++;
        if (daCompletare.length < 10) daCompletare.push({ id: iv.intervento_id, cliente: iv.anagrafica_ragione_sociale, data: iv.intervento_data, descrizione: iv.intervento_descrizione_clean });
      }
      const nomeT = `${iv.incaricato_nome ?? ''} ${iv.incaricato_cognome ?? ''}`.trim() || 'N/A';
      const ore = parseFloat(String(iv.intervento_durata ?? 0)) || 0;
      const t = orePerTecnico.get(nomeT) ?? { ore: 0, n: 0 };
      orePerTecnico.set(nomeT, { ore: t.ore + ore, n: t.n + 1 });
      const nomeC = String(iv.anagrafica_ragione_sociale ?? 'N/A');
      orePerCliente.set(nomeC, (orePerCliente.get(nomeC) ?? 0) + 1);
    }
    return {
      periodo: { da: data_da, a: data_a },
      totale_interventi: totale, chiusi, aperti,
      ore_per_tecnico: [...orePerTecnico.entries()]
        .map(([nome, v]) => ({ nome, ore: Math.round(v.ore * 100) / 100, n_interventi: v.n }))
        .sort((a, b) => b.ore - a.ore),
      clienti_top: [...orePerCliente.entries()]
        .map(([nome, n]) => ({ nome, n_interventi: n }))
        .sort((a, b) => b.n_interventi - a.n_interventi).slice(0, 8),
      da_completare: daCompletare,
    };
  }

  if (toolName === 'get_pipeline_crm') {
    const opResp = await client.post<Record<string,unknown>>('ws_opportunita/opportunities', { token_uid: token, filtro_stato: 'APERTA', num: 50 });
    const ops = ((opResp as {data?:{opportunita?:Record<string,unknown>[]}}).data?.opportunita ?? []);
    const eventiMap = new Map<string, Record<string,unknown> | null>();
    await Promise.all(
      ops.slice(0, 10).map(async (op) => {
        try {
          const r = await client.post<Record<string,unknown>>('ws_opportunita/eventi', { token_uid: token, opportunita_id: op.opportunita_id });
          const eventi = ((r as {data?:{eventi?:Record<string,unknown>[]}}).data?.eventi ?? []);
          eventiMap.set(String(op.opportunita_id), (eventi[0] as Record<string,unknown>) ?? null);
        } catch { eventiMap.set(String(op.opportunita_id), null); }
      })
    );
    const now = Date.now(), DAY = 86400000;
    const attive: unknown[] = [], daRicontattare: unknown[] = [], inattive: unknown[] = [];
    for (const op of ops) {
      const ult = eventiMap.get(String(op.opportunita_id)) ?? null;
      let giorni = 999;
      if (ult?.evento_data) {
        const parts = String(ult.evento_data).split('/');
        if (parts.length === 3) giorni = Math.floor((now - new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime()) / DAY);
      }
      const item = {
        contatore: op.opportunita_contatore, titolo: op.opportunita_titolo,
        cliente: op.opportunita_cliente_nome,
        ultimo_evento: ult ? `${ult.evento_tipologia} del ${ult.evento_data}` : 'nessuno',
        giorni_silenzio: giorni,
      };
      if (giorni <= 14) attive.push(item);
      else if (giorni <= 30) daRicontattare.push(item);
      else inattive.push(item);
    }
    return { totale_aperte: ops.length, attive, da_ricontattare: daRicontattare, inattive };
  }

  if (toolName === 'get_dashboard_commessa') {
    const id = Number(toolInput.commessa_id);
    const [commessaResp, interventiResp] = await Promise.all([
      client.post<Record<string,unknown>>('ws_commesse/commessa',     { token_uid: token, commessa_id: id }),
      client.post<Record<string,unknown>>('ws_interventi/interventi', { token_uid: token, id_commessa: id, num: 20 }),
    ]);
    const c = ((commessaResp as {data?:{commessa?:Record<string,unknown>}}).data?.commessa ?? {});
    const lista = ((interventiResp as {data?:{interventi?:Record<string,unknown>[]}}).data?.interventi ?? []);
    const oreTotali  = parseFloat(String(c.commessa_ore_totali  ?? 0)) || 0;
    const oreUsate   = parseFloat(String(c.commessa_ore_usate   ?? 0)) || 0;
    const oreResidue = parseFloat(String(c.commessa_ore_residue ?? 0)) || 0;
    const pct = oreTotali > 0 ? Math.round((oreUsate / oreTotali) * 100) : 0;
    const tecnici = new Map<string, number>();
    for (const iv of lista) {
      const n = `${iv.incaricato_nome ?? ''} ${iv.incaricato_cognome ?? ''}`.trim();
      if (n) tecnici.set(n, (tecnici.get(n) ?? 0) + (parseFloat(String(iv.intervento_durata ?? 0)) || 0));
    }
    return {
      commessa_id: id, titolo: c.commessa_titolo, cliente: c.cliente_ragione_sociale,
      stato: c.commessa_stato_nome,
      ore: { totali: oreTotali, usate: oreUsate, residue: oreResidue, percentuale_avanzamento: pct },
      tecnici: [...tecnici.entries()].map(([nome, ore]) => ({ nome, ore: Math.round(ore * 100) / 100 })),
      interventi_recenti: lista.slice(0, 6).map((iv) => ({
        id: iv.intervento_id, data: iv.intervento_data, stato: iv.intervento_stato_nome,
        tecnico: `${iv.incaricato_nome ?? ''} ${iv.incaricato_cognome ?? ''}`.trim(),
        ore: iv.intervento_durata, descrizione: iv.intervento_descrizione_clean,
      })),
    };
  }

  if (toolName === 'get_briefing_giorno') {
    const data = (toolInput.data as string | undefined) ?? new Date().toISOString().split('T')[0];
    const dataDisplay = data.split('-').reverse().join('/');
    const [calResp, intResp, tickResp] = await Promise.all([
      client.post<Record<string,unknown>>('ws_common/bacheca_agenda', { token_uid: token, data_inizio: data, data_fine: data }),
      client.post<Record<string,unknown>>('ws_interventi/interventi', { token_uid: token, data_da: data, data_a: data, num: 30 }),
      client.post<Record<string,unknown>>('ws_ticket/tickets',        { token_uid: token, id_priorita: 1, num: 10 }),
    ]);
    return {
      data: dataDisplay,
      interventi_oggi: ((intResp as {data?:{interventi?:Record<string,unknown>[]}}).data?.interventi ?? []).map((iv) => ({
        id: iv.intervento_id, cliente: iv.anagrafica_ragione_sociale,
        tecnico: `${iv.incaricato_nome ?? ''} ${iv.incaricato_cognome ?? ''}`.trim(),
        dalle: iv.intervento_matt_da || iv.intervento_pome_da || '—',
        alle:  iv.intervento_matt_a  || iv.intervento_pome_a  || '—',
        descrizione: iv.intervento_descrizione_clean,
      })),
      appuntamenti_crm: ((calResp as {data?:{agenda?:unknown[]}}).data?.agenda ?? []),
      ticket_urgenti: ((tickResp as {data?:{tickets?:Record<string,unknown>[]}}).data?.tickets ?? []).slice(0,5).map((t) => ({
        id: t.id_ticket, titolo: t.titolo, cliente: t.cliente_ragione_sociale, data_apertura: t.data_apertura,
      })),
    };
  }

  // --- Fine aggregazioni ---

  const endpoint = ENDPOINT_MAP[toolName];

  const body: Record<string, unknown> = { token_uid: token, ...toolInput };

  // create_intervento / update_intervento: converti array tecnici in formato API
  if (toolName === 'create_intervento' || toolName === 'update_intervento' || toolName === 'close_intervento') {
    if (Array.isArray(body.intervento_utenti_utente_id)) {
      // L'API vuole intervento_utenti_utente_id[] come chiavi separate
      const ids = body.intervento_utenti_utente_id as number[];
      delete body.intervento_utenti_utente_id;
      ids.forEach((id, i) => {
        body[`intervento_utenti_utente_id[${i}]`] = id;
      });
    }
  }

  // create_ticket / update_ticket: l'API si aspetta `titolo`, il tool usa `oggetto`
  if (toolName === 'create_ticket' || toolName === 'update_ticket') {
    if (body.oggetto !== undefined) {
      body.titolo = body.oggetto;
      delete body.oggetto;
    }
  }

  // search_clienti: passa il nome come parametro "find"
  if (toolName === 'search_clienti' && body.query) {
    body.find = body.query;
    body.num = 20;
    delete body.query;
  }

  // search_preventivi: supporta ricerca per numero preventivo e cliente
  if (toolName === 'search_preventivi') {
    if (body.numero_preventivo) {
      body.find = body.numero_preventivo;
      delete body.numero_preventivo;
    }
    if (body.cliente_id) {
      // Mantiene cliente_id come parametro per API
    }
    if (!body.num) {
      body.num = 50; // Default per ricerca preventivi
    }
    if (!body.years) {
      // Ultimi 3 anni di default
      const currentYear = new Date().getFullYear();
      body.years = `${currentYear},${currentYear - 1},${currentYear - 2}`;
    }
  }

  // get_preventivo: richiede tipo_doc e documento_id
  if (toolName === 'get_preventivo' && body.documento_id) {
    body.tipo_doc = 'preventivi';
  }

  // get_preventivo_pdf: richiede tipo_doc, documento_id e pdf=1
  if (toolName === 'get_preventivo_pdf' && body.documento_id) {
    body.tipo_doc = 'preventivi';
    body.pdf = 1;
  }

  // cambia_stato_preventivo: richiede tipo_doc, documento_id e stato_id
  if (toolName === 'cambia_stato_preventivo' && body.documento_id && body.stato_id) {
    body.tipo_doc = 'preventivi';
  }

  // get_stati_preventivi: richiede tipo_doc
  if (toolName === 'get_stati_preventivi') {
    body.tipo_doc = 'preventivi';
  }

  // create_preventivo: imposta tipo documento, converte data e normalizza righe
  if (toolName === 'create_preventivo') {
    body.tipo_doc = 'preventivi';       // convenzione ws_documenti per list/stato
    body.documento_tipo = 'PREVENTIVO'; // campo nel body del documento
    body.documento_lang = 'it';         // campo sempre presente nelle risposte, potenzialmente obbligatorio
    if (typeof body.documento_data === 'string' && body.documento_data.includes('/')) {
      const [d, m, y] = (body.documento_data as string).split('/');
      body.documento_data = `${y}-${m}-${d}`;
    }
    if (Array.isArray(body.righe)) {
      body.righe = (body.righe as Record<string, unknown>[]).map((r, i) => ({
        riga_dett_qta: 1,
        riga_dett_perc_iva: 22,
        riga_dett_sconto: 0,
        riga_dett_rank: (i + 1) * 10,
        ...r,
      }));
    }
  }

  // create_evento_crm: normalizza formato ora e rinomina campo location
  if (toolName === 'create_evento_crm') {
    // Fallback tipo evento
    if (!body.evento_tipologia) body.evento_tipologia = 'MEETING';

    // Normalizza HH:MM — converte "15.30" o "1530" in "15:30"
    for (const field of ['evento_dalle_ore', 'evento_alle_ore'] as const) {
      if (body[field] && typeof body[field] === 'string') {
        const raw = String(body[field]).replace(/[.,]/, ':');
        // "1530" → "15:30"
        if (/^\d{4}$/.test(raw)) {
          body[field] = `${raw.slice(0, 2)}:${raw.slice(2)}`;
        } else {
          body[field] = raw;
        }
      }
    }

    // Campo location: accetta sia evento_localita (vecchio) che evento_location
    if (body.evento_localita && !body.evento_location) {
      body.evento_location = body.evento_localita;
      delete body.evento_localita;
    }
  }

  // search_opportunita: opzionalmente filtra per stato (esclude RIFIUTATO, ACCETTATO)
  if (toolName === 'search_opportunita') {
    if (!body.stato_id) {
      body.filtro_stato = 'APERTA'; // default: only open opportunities
    }
  }

  // add_activity_to_intervento: mappa campi user-friendly → API (interventi_attivita_*)
  if (toolName === 'add_activity_to_intervento') {
    body.interventi_attivita_intervento_id = body.intervento_id;
    body.interventi_attivita_titolo        = body.titolo ?? 'Lavoro';
    body.interventi_attivita_data          = body.data;
    body.interventi_attivita_dalle_ore     = body.dalle_ore ?? '09:00';
    if (body.alle_ore)    body.interventi_attivita_alle_ore    = body.alle_ore;
    if (body.descrizione) body.interventi_attivita_descrizione = body.descrizione;
    body.interventi_attivita_incaricato_id = body.incaricato_id;
    // Converti ore+minuti → formato "HH.MM" usato dall'API
    const h = Number(body.ore ?? 0);
    const m = Number(body.minuti ?? 0);
    body.interventi_attivita_durata = `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
    // Rimuovi campi user-friendly
    for (const f of ['intervento_id','titolo','data','dalle_ore','alle_ore','ore','minuti','incaricato_id','descrizione']) {
      delete body[f];
    }
  }

  // list_interventi: default num, smart range se nessun filtro specificato
  if (toolName === 'list_interventi') {
    if (!body.num) body.num = 50;
    const hasFilter = body.data_da || body.data_a || body.id_cliente || body.addetto_uid || body.id_commessa || body.id_stato || body.years;
    if (!hasFilter) {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      body.data_da = from.toISOString().split('T')[0];
      body.data_a  = now.toISOString().split('T')[0];
    }
  }

  // search_prodotti: rinomina query → find, default num
  if (toolName === 'search_prodotti') {
    if (body.query) { body.find = body.query; delete body.query; }
    if (!body.num) body.num = 20;
  }

  // get_contatti_cliente: rinomina cliente_id → anagrafica_id
  if (toolName === 'get_contatti_cliente' && body.cliente_id) {
    body.anagrafica_id = body.cliente_id;
    delete body.cliente_id;
  }

  // list_impianti: rinomina cliente_id → anagrafica_id
  if (toolName === 'list_impianti') {
    if (body.cliente_id) { body.anagrafica_id = body.cliente_id; delete body.cliente_id; }
    if (!body.num) body.num = 50;
  }

  // search_commesse: di default mostra solo commesse attive
  if (toolName === 'search_commesse') {
    if (body.solo_attive === undefined) {
      body.solo_attive = 1; // default: active only
    }
  }

  // get_ore_tecnico: aggrega le ore del tecnico nel periodo usando intervento_durata
  if (toolName === 'get_ore_tecnico') {
    const { addetto_uid, data_da, data_a } = toolInput as { addetto_uid: number; data_da: string; data_a: string };

    type InterventoItem = {
      intervento_id?: unknown;
      intervento_data?: unknown;
      intervento_durata?: unknown;
      intervento_stato_nome?: unknown;
      anagrafica_ragione_sociale?: unknown;
      intervento_uid?: unknown;
      utenti_selected?: unknown[];
    };

    const listResp = (await client.post('ws_interventi/interventi', {
      token_uid: token,
      data_da,
      data_a,
      num: 400,
      offset: 0,
    })) as { data?: { interventi?: InterventoItem[] } };

    const lista = listResp?.data?.interventi ?? [];

    // Filtra interventi assegnati al tecnico (proprietario o addetto)
    const uidStr = String(addetto_uid);
    const interventiTecnico = lista.filter((iv) => {
      if (String(iv.intervento_uid) === uidStr) return true;
      const sel = iv.utenti_selected ?? [];
      return sel.some((uid) => String(uid) === uidStr);
    });

    let totaleOre = 0;
    const dettaglio: Array<{ id: number; data: string; ore: number; cliente: string; stato: string }> = [];

    for (const iv of interventiTecnico) {
      const ore = parseFloat(String(iv.intervento_durata ?? 0)) || 0;
      totaleOre += ore;
      dettaglio.push({
        id: Number(iv.intervento_id),
        data: String(iv.intervento_data ?? ''),
        ore: Math.round(ore * 100) / 100,
        cliente: String(iv.anagrafica_ragione_sociale ?? ''),
        stato: String(iv.intervento_stato_nome ?? ''),
      });
    }

    return {
      totale_ore: Math.round(totaleOre * 100) / 100,
      numero_interventi: interventiTecnico.length,
      periodo: { da: data_da, a: data_a },
      dettaglio,
    };
  }

  if (!endpoint) throw new Error(`Nessun endpoint per il tool: ${toolName}`);

  const result = await client.post<Record<string, unknown>>(endpoint, body);

  // Write tools segnalano fallimenti con status_code !== 1 (es. false, 0).
  // I read tool non vengono controllati perché empty results possono avere status variabili.
  if (!READ_TOOLS.has(toolName)) {
    const sc = result.status_code;
    if (sc !== undefined && sc !== 1 && sc !== true) {
      const msg = typeof result.message === 'string' ? result.message : undefined;
      throw new Error(msg ?? `Operazione non riuscita (${toolName})`);
    }
  }

  // Dopo create_preventivo, recupera il preventivo appena creato per esporre fattura_id/numero.
  // L'API restituisce documento_id: null nella risposta immediata; la search lo trova per oggetto.
  if (toolName === 'create_preventivo') {
    const doc = (result as { data?: { documento?: Record<string, unknown> } }).data?.documento;
    if (doc && !doc.documento_id) {
      try {
        const search = await client.post<Record<string, unknown>>('ws_preventivi/preventivi', {
          token_uid: token,
          num: 5,
        });
        const lista = (search as { data?: { preventivi?: Record<string, unknown>[] } }).data?.preventivi ?? [];
        const oggetto = toolInput.documento_oggetto as string;
        const found = lista.find((p) => p.fattura_oggetto === oggetto) ?? lista[0];
        return { ...result, preventivo_creato: found ?? null };
      } catch { /* fallback: ritorna solo il risultato originale */ }
    }
    return result;
  }

  // Dopo create_opportunita, recupera l'opportunità appena creata per esporre l'opportunita_id
  // reale (visibile nella UI Syncrogest), che è diverso da inserted_id (ID interno del DB).
  // L'AI deve usare opportunita_id dalla search per i successivi create_evento_crm.
  // Salva in cache i tool statici dopo la prima chiamata API
  if (CACHED_TOOLS.has(toolName)) {
    setCached(toolName, result, TTL_60MIN);
    return result;
  }

  // Applica trimming campi per ridurre payload verso l'AI (solo read tool)
  if (READ_TOOLS.has(toolName)) {
    return trimResponse(toolName, result);
  }

  if (toolName === 'create_opportunita') {
    const clienteId = toolInput.opportunita_cliente_id as number;
    const titolo = toolInput.opportunita_titolo as string;
    try {
      const search = await client.post<Record<string, unknown>>('ws_opportunita/opportunities', {
        token_uid: token,
        cliente_id: clienteId,
      });
      const lista = (search as { data?: { lista?: Record<string, unknown>[] } }).data?.lista ?? [];
      const nuova = lista.find(
        (o) => o.opportunita_titolo === titolo || String(o.opportunita_id) === String(result.data && (result.data as Record<string, unknown>).inserted_id),
      );
      return {
        ...result,
        opportunita_creata: nuova ?? lista[0] ?? null,
        _nota: 'Usa opportunita_creata.opportunita_id (non inserted_id) per create_evento_crm',
      };
    } catch {
      // fallback: ritorna solo il risultato originale
    }
  }

  return result;
}
