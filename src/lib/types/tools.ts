export type SyncrogestToolName =
  // ws_common
  | 'get_calendario'
  | 'get_clienti'
  | 'search_clienti'
  | 'get_company_info'
  // ws_ticket
  | 'list_tickets'
  | 'create_ticket'
  | 'update_ticket'
  | 'get_ticket_states'
  | 'get_ticket_priorities'
  | 'get_ticket_categories'
  | 'add_ticket_note'
  | 'get_ticket_notes'
  // ws_interventi
  | 'list_interventi'
  | 'get_intervento'
  | 'create_intervento'
  | 'update_intervento'
  | 'close_intervento'
  | 'add_activity_to_intervento'
  | 'add_product_to_intervento'
  | 'assign_staff_to_intervento'
  | 'get_intervento_activities'
  | 'get_intervento_products'
  | 'get_intervento_staff'
  | 'generate_pdf_intervento'
  | 'send_email_intervento'
  | 'get_ticket_from_intervento'
  | 'get_staff_list'
  | 'get_intervento_states'
  | 'get_intervento_categories'
  // aggregazioni server-side
  | 'get_ore_tecnico'
  // ws_preventivi
  | 'search_preventivi'
  | 'get_preventivo'
  | 'get_preventivo_pdf'
  | 'cambia_stato_preventivo'
  | 'get_stati_preventivi'
  | 'create_preventivo'
  // ws_opportunita (CRM)
  | 'search_opportunita'
  | 'create_opportunita'
  | 'create_evento_crm'
  | 'get_eventi_opportunita'
  // ws_commesse (Projects)
  | 'search_commesse'
  | 'get_commessa'
  // ws_prodotti
  | 'search_prodotti'
  // ws_contatti
  | 'get_contatti_cliente'
  // ws_impianti
  | 'list_impianti'
  | 'get_impianto'
  // ws_opportunita extra
  | 'get_tipologie_evento_crm'
  // aggregazioni server-side ottimizzate (1 chiamata → N API Syncrogest in parallelo)
  | 'get_scheda_cliente'
  | 'get_report_periodo'
  | 'get_pipeline_crm'
  | 'get_dashboard_commessa'
  | 'get_briefing_giorno';

export interface ToolCallResult {
  toolName: SyncrogestToolName;
  toolInput: Record<string, unknown>;
  humanSummary: string;
}
