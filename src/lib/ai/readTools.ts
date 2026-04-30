import type { SyncrogestToolName } from '../types/tools';

export const READ_TOOLS = new Set<SyncrogestToolName>([
  'get_calendario', 'search_clienti', 'get_clienti', 'get_company_info',
  'list_tickets', 'get_ticket_states', 'get_ticket_priorities',
  'get_ticket_categories', 'get_ticket_notes',
  'list_interventi', 'get_intervento', 'get_intervento_activities',
  'get_intervento_products', 'get_intervento_staff',
  'get_ticket_from_intervento', 'get_staff_list',
  'get_intervento_states', 'get_intervento_categories',
  'search_preventivi', 'get_preventivo', 'get_stati_preventivi',
  'get_ore_tecnico',
  'search_opportunita', 'get_eventi_opportunita', 'search_commesse',
]);
