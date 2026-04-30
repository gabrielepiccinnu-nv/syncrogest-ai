import { NextRequest, NextResponse } from 'next/server';
import { interpretWithClaude } from '@/lib/ai/claudeClient';
import { interpretWithDeepSeek } from '@/lib/ai/deepseekClient';
import type { AIEngine, ChatApiResponse, HistoryEntry } from '@/lib/types/chat';

/**
 * POST /api/chat
 * Riceve il messaggio utente, la history e l'engine selezionato.
 * Delega a interpretWithClaude o interpretWithDeepSeek e normalizza la risposta
 * in uno dei tre tipi: `preview` (conferma richiesta), `auto_executed`, `text`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message: string;
      engine: AIEngine;
      history: HistoryEntry[];
    };

    const { message, engine, history } = body;

    const result =
      engine === 'claude'
        ? await interpretWithClaude(message, history)
        : await interpretWithDeepSeek(message, history);

    if (result.type === 'tool_call' && result.toolCall) {
      return NextResponse.json({
        type: 'preview',
        toolName: result.toolCall.toolName,
        toolInput: result.toolCall.toolInput,
        humanSummary: result.toolCall.humanSummary,
      } satisfies ChatApiResponse);
    }

    if (result.type === 'auto_executed') {
      return NextResponse.json({
        type: 'auto_executed',
        text: result.text,
        executedSteps: result.executedSteps,
      } satisfies ChatApiResponse);
    }

    return NextResponse.json({
      type: 'text',
      text: result.text,
    } satisfies ChatApiResponse);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json(
      { type: 'error', error } satisfies ChatApiResponse,
      { status: 500 },
    );
  }
}
