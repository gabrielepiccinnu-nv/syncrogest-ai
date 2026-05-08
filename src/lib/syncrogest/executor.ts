import { SyncrogestClient } from './client';
import { getAuthToken } from './auth';
import type { SyncrogestToolName } from '../types/tools';
import { READ_TOOLS } from '../ai/readTools';

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

  // get_ore_tecnico: aggrega le ore del tecnico nel periodo richiesto
  if (toolName === 'get_ore_tecnico') {
    const { addetto_uid, data_da, data_a } = toolInput as { addetto_uid: number; data_da: string; data_a: string };

    type AttivitaItem = {
      interventi_attivita_incaricato_id?: unknown;
      interventi_attivita_diff_ore?: unknown;
      interventi_attivita_data?: unknown;
    };
    type InterventoItem = {
      intervento_id?: unknown;
      intervento_data?: unknown;
      anagrafica_ragione_sociale?: unknown;
      intervento_uid?: unknown;
      utenti_selected?: unknown[];
      intervento_attivita?: { lista?: AttivitaItem[] };
    };

    // Recupera tutti gli interventi del periodo (senza filtro utente per massima compatibilità)
    const listResp = (await client.post('ws_interventi/interventi', {
      token_uid: token,
      data_da,
      data_a,
      num: 400,
      offset: 0,
    })) as { data?: { lista?: InterventoItem[] } };

    const lista = listResp?.data?.lista ?? [];

    // Filtra interventi dove il tecnico è assegnato:
    // controlla sia utenti_selected (array addetti) che intervento_uid (proprietario)
    const interventiTecnico = lista.filter((iv) => {
      const uidStr = String(addetto_uid);
      if (String(iv.intervento_uid) === uidStr) return true;
      const sel = iv.utenti_selected ?? [];
      return sel.some((uid) => String(uid) === uidStr);
    });

    let totalOre = 0;
    const dettaglio: Array<{ id: number; data: string; ore: number; cliente: string; fonte: string }> = [];

    for (const intervento of interventiTecnico) {
      const id = Number(intervento.intervento_id);
      let oreIntervento = 0;
      let fonte = 'attivita';

      // Tenta attività embedded
      const embeddedLista = intervento.intervento_attivita?.lista ?? [];
      const attivitaTecnico = embeddedLista.filter(
        (a) => String(a.interventi_attivita_incaricato_id) === String(addetto_uid),
      );

      if (attivitaTecnico.length > 0) {
        for (const att of attivitaTecnico) {
          const ore = parseFloat(String(att.interventi_attivita_diff_ore ?? 0));
          if (!isNaN(ore)) oreIntervento += ore;
        }
      } else {
        // Fallback: chiama attivita_intervento separatamente
        try {
          const attResp = (await client.post('ws_interventi/attivita_intervento', {
            token_uid: token,
            intervento_id: id,
          })) as { data?: { lista?: AttivitaItem[] } };
          const attLista = attResp?.data?.lista ?? [];
          const attFiltrate = attLista.filter(
            (a) => String(a.interventi_attivita_incaricato_id) === String(addetto_uid),
          );
          for (const att of attFiltrate) {
            const ore = parseFloat(String(att.interventi_attivita_diff_ore ?? 0));
            if (!isNaN(ore)) oreIntervento += ore;
          }
          fonte = attFiltrate.length > 0 ? 'attivita_esplicita' : 'nessuna_attivita';
        } catch {
          fonte = 'errore_attivita';
        }
      }

      if (oreIntervento > 0) {
        totalOre += oreIntervento;
        dettaglio.push({
          id,
          data: String(intervento.intervento_data ?? ''),
          ore: Math.round(oreIntervento * 100) / 100,
          cliente: String(intervento.anagrafica_ragione_sociale ?? ''),
          fonte,
        });
      }
    }

    return {
      totale_ore: Math.round(totalOre * 100) / 100,
      numero_interventi_assegnati: interventiTecnico.length,
      numero_interventi_con_ore: dettaglio.length,
      periodo: { da: data_da, a: data_a },
      dettaglio,
      // debug: per diagnostica, primi 3 interventi raw con campi chiave
      _debug: {
        totale_interventi_nel_periodo: lista.length,
        interventi_assegnati_al_tecnico: interventiTecnico.length,
        esempio_primo_intervento: lista[0]
          ? {
              id: lista[0].intervento_id,
              uid: lista[0].intervento_uid,
              utenti_selected: lista[0].utenti_selected,
              ha_attivita_embedded: (lista[0].intervento_attivita?.lista?.length ?? 0) > 0,
            }
          : null,
      },
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
