import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/syncrogest/executor';
import type { SyncrogestToolName } from '@/lib/types/tools';
import type { ExecuteApiResponse } from '@/lib/types/chat';

/**
 * POST /api/syncrogest
 * Riceve il nome del tool e i parametri confermati dall'utente, li esegue tramite `executeTool`
 * e ritorna il risultato raw dell'API Syncrogest.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      toolName: SyncrogestToolName;
      toolInput: Record<string, unknown>;
    };

    const result = await executeTool(body.toolName, body.toolInput);

    return NextResponse.json({
      success: true,
      data: result,
    } satisfies ExecuteApiResponse);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json(
      { success: false, error } satisfies ExecuteApiResponse,
      { status: 500 },
    );
  }
}
