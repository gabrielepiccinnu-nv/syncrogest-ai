import Anthropic from '@anthropic-ai/sdk';
import { SYNCROGEST_TOOLS } from './toolDefinitions';
import { SYSTEM_PROMPT } from './systemPrompt';
import { executeTool } from '../syncrogest/executor';
import { READ_TOOLS } from './readTools';
import type { HistoryEntry } from '../types/chat';
import type { ToolCallResult, SyncrogestToolName } from '../types/tools';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MAX_AUTO_STEPS = 10;
const TOOL_RESULT_MAX_CHARS = 8000;

export interface ExecutedStep {
  toolName: SyncrogestToolName;
  toolInput: Record<string, unknown>;
  result: unknown;
}

export interface InterpretResult {
  type: 'tool_call' | 'text' | 'auto_executed';
  toolCall?: ToolCallResult;
  text?: string;
  executedSteps?: ExecutedStep[];
}

export async function interpretWithClaude(
  userMessage: string,
  history: HistoryEntry[],
): Promise<InterpretResult> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    {
      role: 'user',
      // Inject today's date here — NOT in the system prompt (would break cache)
      content: `[Data odierna: ${new Date().toLocaleDateString('it-IT')}]\n\n${userMessage}`,
    },
  ];

  const executedSteps: ExecutedStep[] = [];

  for (let step = 0; step < MAX_AUTO_STEPS; step++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: SYNCROGEST_TOOLS as Anthropic.Tool[],
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
      tool_choice: { type: 'auto' },
    });

    const toolUseBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (!toolUseBlock) {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      );
      const text = textBlock?.text ?? 'Nessuna risposta generata.';
      if (executedSteps.length > 0) {
        return { type: 'auto_executed', text, executedSteps };
      }
      return { type: 'text', text };
    }

    const toolName = toolUseBlock.name as SyncrogestToolName;
    const toolInput = toolUseBlock.input as Record<string, unknown>;

    if (!READ_TOOLS.has(toolName)) {
      return {
        type: 'tool_call',
        toolCall: {
          toolName,
          toolInput,
          humanSummary: buildHumanSummary(toolName, toolInput),
        },
        executedSteps: executedSteps.length > 0 ? executedSteps : undefined,
      };
    }

    // Auto-execute read tool
    const result = await executeTool(toolName, toolInput);
    executedSteps.push({ toolName, toolInput, result });

    // Feed result back into conversation (Anthropic agentic format)
    messages.push({
      role: 'assistant',
      content: response.content,
    });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(result).slice(0, TOOL_RESULT_MAX_CHARS),
        },
      ],
    });
  }

  return {
    type: 'auto_executed',
    text: 'Ho raggiunto il limite di operazioni automatiche. Prova a riformulare la domanda in modo più specifico.',
    executedSteps,
  };
}

function buildHumanSummary(
  toolName: SyncrogestToolName,
  input: Record<string, unknown>,
): string {
  const summaries: Partial<Record<SyncrogestToolName, (i: typeof input) => string>> = {
    create_intervento: (i) => {
      const ora = i.intervento_matt_da
        ? ` dalle ${i.intervento_matt_da}${i.intervento_matt_a ? ` → ${i.intervento_matt_a}` : ''}`
        : i.intervento_pome_da
          ? ` dalle ${i.intervento_pome_da}${i.intervento_pome_a ? ` → ${i.intervento_pome_a}` : ''}`
          : '';
      const commessa = i.intervento_commessa_id ? ` su commessa #${i.intervento_commessa_id}` : '';
      const tecnici = Array.isArray(i.intervento_utenti_utente_id)
        ? ` — tecnici: ${(i.intervento_utenti_utente_id as number[]).join(', ')}`
        : '';
      return `Creare intervento per cliente ID ${i.intervento_cliente_id} il ${i.intervento_data}${ora}${commessa}: "${i.intervento_descrizione}"${tecnici}`;
    },
    create_ticket: (i) =>
      `Aprire un ticket per il cliente ID ${i.id_cliente}: "${i.oggetto}"`,
    update_intervento: (i) =>
      `Aggiornare l'intervento #${i.intervento_id}`,
    update_ticket: (i) =>
      `Aggiornare il ticket #${i.id_ticket}`,
    close_intervento: (i) =>
      `Chiudere l'intervento #${i.intervento_id}`,
    list_interventi: (i) =>
      `Cercare interventi${i.data_da ? ` dal ${i.data_da} al ${i.data_a}` : ''}${i.addetto_uid ? ` per tecnico ID ${i.addetto_uid}` : ''}`,
    list_tickets: (i) =>
      `Cercare ticket${i.id_stato ? ` con stato ID ${i.id_stato}` : ''}`,
    search_clienti: (i) =>
      `Cercare clienti con nome "${i.query}"`,
    get_clienti: () =>
      'Recuperare la lista clienti',
    get_calendario: (i) =>
      `Recuperare il calendario dal ${i.data_inizio} al ${i.data_fine}`,
    get_company_info: () =>
      'Recuperare le informazioni aziendali',
    assign_staff_to_intervento: (i) =>
      `Assegnare il tecnico ID ${i.id_utente} all'intervento #${i.id_intervento}`,
    add_activity_to_intervento: (i) =>
      `Aggiungere ${i.ore}h di attività all'intervento #${i.id_intervento}`,
    add_product_to_intervento: (i) =>
      `Aggiungere il prodotto ID ${i.id_prodotto} (x${i.quantita}) all'intervento #${i.id_intervento}`,
    send_email_intervento: (i) =>
      `Inviare email per l'intervento #${i.id_intervento}`,
    generate_pdf_intervento: (i) =>
      `Generare PDF per l'intervento #${i.id_intervento}`,
    add_ticket_note: (i) =>
      `Aggiungere una nota al ticket #${i.id_ticket}`,
    get_ticket_from_intervento: (i) =>
      `Recuperare il ticket collegato all'intervento #${i.id_intervento}`,
    get_staff_list: () =>
      'Recuperare la lista del personale',
    get_intervento_states: () =>
      'Recuperare gli stati degli interventi',
    get_intervento_categories: () =>
      'Recuperare le categorie degli interventi',
    get_ticket_states: () =>
      'Recuperare gli stati dei ticket',
    get_ticket_priorities: () =>
      'Recuperare le priorità dei ticket',
    get_ticket_categories: () =>
      'Recuperare le categorie dei ticket',
    get_intervento: (i) =>
      `Recuperare i dettagli dell'intervento #${i.id_intervento}`,
    get_intervento_activities: (i) =>
      `Recuperare le attività dell'intervento #${i.id_intervento}`,
    get_intervento_products: (i) =>
      `Recuperare i prodotti dell'intervento #${i.id_intervento}`,
    get_intervento_staff: (i) =>
      `Recuperare il personale dell'intervento #${i.id_intervento}`,
    get_ticket_notes: (i) =>
      `Recuperare le note del ticket #${i.id_ticket}`,
    get_ore_tecnico: (i) =>
      `Calcolare le ore del tecnico ID ${i.addetto_uid} dal ${i.data_da} al ${i.data_a}`,
    get_eventi_opportunita: (i) =>
      `Recuperare gli eventi dell'opportunità #${i.opportunita_id}`,
    search_opportunita: (i) =>
      `Cercare opportunità CRM per cliente ID ${i.cliente_id}`,
    create_opportunita: (i) =>
      `Creare opportunità CRM "${i.opportunita_titolo}" per cliente ID ${i.opportunita_cliente_id}`,
    create_evento_crm: (i) => {
      const oreFine = i.evento_alle_ore ? ` → ${i.evento_alle_ore}` : '';
      return `Creare evento CRM "${i.evento_nome}" il ${i.evento_data} dalle ${i.evento_dalle_ore}${oreFine} (tipo: ${i.evento_tipologia}) per opportunità #${i.evento_opportunita_id}`;
    },
    search_commesse: (i) =>
      `Cercare commesse (progetti) per cliente ID ${i.cliente_id}`,
  };

  const fn = summaries[toolName];
  return fn ? fn(input) : `Eseguire: ${toolName.replace(/_/g, ' ')}`;
}
