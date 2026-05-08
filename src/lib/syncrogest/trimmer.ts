import type { SyncrogestToolName } from '../types/tools';

// Campi da tenere per tool. Tutto il resto viene scartato per ridurre il payload verso l'AI.
const WHITELIST: Partial<Record<SyncrogestToolName, string[]>> = {
  list_interventi: [
    'intervento_id', 'intervento_contatore', 'intervento_data',
    'intervento_descrizione_clean', 'intervento_stato_nome', 'intervento_durata',
    'intervento_commessa_id', 'intervento_ticket_id', 'intervento_cliente_id',
    'anagrafica_ragione_sociale', 'incaricato_nome', 'incaricato_cognome',
    'intervento_matt_da', 'intervento_matt_a', 'intervento_pome_da', 'intervento_pome_a',
    'intervento_priorita_nome', 'intervento_categoria_nome',
  ],
  list_tickets: [
    'id_ticket', 'ticket_contatore', 'titolo', 'descrizione',
    'stato_nome', 'priorita_nome', 'categoria_nome',
    'cliente_ragione_sociale', 'data_apertura', 'data_scadenza',
  ],
  search_preventivi: [
    'fattura_id', 'fattura_numero', 'fattura_oggetto', 'fattura_data',
    'fattura_totale', 'fattura_totale_iva', 'cliente_ragione_sociale', 'stato_nome',
  ],
  search_opportunita: [
    'opportunita_id', 'opportunita_contatore', 'opportunita_titolo',
    'opportunita_cliente_nome', 'opportunita_stato', 'opportunita_data_creazione',
    'opportunita_addetto_nome',
  ],
  search_commesse: [
    'commessa_id', 'commessa_titolo', 'commessa_stato_nome',
    'cliente_ragione_sociale', 'commessa_data_inizio', 'commessa_data_fine',
    'commessa_ore_totali', 'commessa_ore_usate', 'commessa_ore_residue',
  ],
  get_contatti_cliente: [
    'contatto_id', 'contatto_nome', 'contatto_cognome',
    'contatto_email', 'contatto_telefono', 'contatto_ruolo',
  ],
  list_impianti: [
    'impianto_id', 'impianto_nome', 'impianto_matricola', 'impianto_tipo',
    'impianto_cliente_nome', 'impianto_data_installazione', 'impianto_garanzia_scadenza',
  ],
  get_intervento: [
    'intervento_id', 'intervento_contatore', 'intervento_data', 'intervento_descrizione',
    'intervento_descrizione_clean', 'intervento_stato_nome', 'intervento_durata',
    'intervento_commessa_id', 'intervento_ticket_id', 'intervento_priorita_nome',
    'intervento_categoria_nome', 'anagrafica_ragione_sociale',
    'incaricato_nome', 'incaricato_cognome', 'intervento_localita',
    'intervento_matt_da', 'intervento_matt_a', 'intervento_pome_da', 'intervento_pome_a',
  ],
  get_eventi_opportunita: [
    'evento_id', 'evento_nome', 'evento_tipologia', 'evento_data',
    'evento_dalle_ore', 'evento_alle_ore', 'evento_location',
    'addetto_nome', 'addetto_cognome',
  ],
  search_clienti: [
    'anagrafica_id', 'anagrafica_ragione_sociale', 'anagrafica_tipologia',
    'anagrafica_email', 'anagrafica_telefono', 'anagrafica_citta',
    'anagrafica_piva', 'anagrafica_codice_fiscale',
  ],
};

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== '' && v !== undefined)
  );
}

function applyWhitelist(
  obj: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  return Object.fromEntries(
    keys.filter((k) => k in obj && obj[k] !== null && obj[k] !== undefined && obj[k] !== '').map((k) => [k, obj[k]])
  );
}

function trimArray(arr: unknown[], keys: string[]): unknown[] {
  return arr.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return applyWhitelist(item as Record<string, unknown>, keys);
    }
    return item;
  });
}

/** Riduce il payload della risposta Syncrogest prima di inviarlo all'AI. */
export function trimResponse(toolName: SyncrogestToolName, result: unknown): unknown {
  if (!result || typeof result !== 'object') return result;

  const res = result as Record<string, unknown>;
  const data = res.data as Record<string, unknown> | undefined;
  if (!data) return result;

  const whitelist = WHITELIST[toolName];
  if (!whitelist) {
    // Nessuna whitelist: strip globale dei null su array di primo livello
    const trimmedData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) {
        trimmedData[k] = v.map((item) =>
          item && typeof item === 'object' ? stripNulls(item as Record<string, unknown>) : item
        );
      } else {
        trimmedData[k] = v;
      }
    }
    return { ...res, data: trimmedData };
  }

  // Trova l'array principale nella risposta (primo Array trovato in data)
  const trimmedData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      trimmedData[k] = trimArray(v, whitelist);
    } else if (v && typeof v === 'object') {
      // Singolo oggetto (es. get_intervento restituisce un singolo intervento)
      trimmedData[k] = applyWhitelist(v as Record<string, unknown>, whitelist);
    } else {
      trimmedData[k] = v;
    }
  }

  return { ...res, data: trimmedData };
}
