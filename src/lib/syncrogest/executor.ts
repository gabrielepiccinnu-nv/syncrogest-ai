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
  // ws_opportunita (CRM)
  search_opportunita:         'ws_opportunita/opportunities',
  get_eventi_opportunita:     'ws_opportunita/eventi',
  create_opportunita:         'ws_opportunita/save_opportunita',
  create_evento_crm:          'ws_opportunita/save_evento',
  // ws_commesse (Projects)
  search_commesse:            'ws_commesse/commesse',
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

  return result;
}
