'use client';

import type { AIResultMessage } from '@/lib/types/chat';

interface ResultCardProps {
  message: AIResultMessage;
}

const TOOL_LABELS: Partial<Record<string, string>> = {
  create_intervento: 'Intervento creato',
  create_ticket: 'Ticket aperto',
  update_intervento: 'Intervento aggiornato',
  update_ticket: 'Ticket aggiornato',
  close_intervento: 'Intervento chiuso',
  add_activity_to_intervento: 'Attività registrata',
  add_product_to_intervento: 'Prodotto aggiunto',
  assign_staff_to_intervento: 'Tecnico assegnato',
  send_email_intervento: 'Email inviata',
  generate_pdf_intervento: 'PDF generato',
  add_ticket_note: 'Nota aggiunta',
  create_opportunita: 'Opportunità creata',
  create_evento_crm: 'Evento CRM creato',
  create_preventivo: 'Preventivo creato',
  cambia_stato_preventivo: 'Stato preventivo aggiornato',
};

function extractId(result: Record<string, unknown>): string | null {
  const candidates = [
    'inserted_id', 'intervento_id', 'id_ticket', 'evento_id',
    'opportunita_id', 'fattura_id',
  ];
  for (const k of candidates) {
    if (result[k] != null) return String(result[k]);
  }
  const data = result.data as Record<string, unknown> | undefined;
  if (data) {
    for (const k of candidates) {
      if (data[k] != null) return String(data[k]);
    }
  }
  return null;
}

export function ResultCard({ message }: ResultCardProps) {
  const result = message.result as Record<string, unknown> | null;
  const isError = result != null && ('errore' in result || (result.data != null && typeof result.data === 'object' && 'errore' in (result.data as object)));
  const label = TOOL_LABELS[message.toolName] ?? message.toolName.replace(/_/g, ' ');
  const extractedId = result && !isError ? extractId(result) : null;

  return (
    <div className={`flex items-start gap-2.5 max-w-sm ${isError ? '' : ''}`}>
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mt-0.5 ${isError ? 'bg-red-500' : 'bg-green-500'}`}>
        {isError ? '✕' : '✓'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isError ? 'text-red-700' : 'text-green-700'}`}>
          {isError ? 'Operazione fallita' : label}
          {extractedId && <span className="ml-1.5 font-normal text-gray-500">#{extractedId}</span>}
        </p>
        {isError && (
          <p className="text-xs text-red-600 mt-0.5">
            {String((result as Record<string, unknown>).errore ?? 'Errore sconosciuto')}
          </p>
        )}
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">
            Dettagli tecnici
          </summary>
          <pre className="mt-1.5 text-xs bg-gray-50 border border-gray-200 p-2 rounded overflow-auto max-h-48 text-gray-600">
            {JSON.stringify(message.result, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
