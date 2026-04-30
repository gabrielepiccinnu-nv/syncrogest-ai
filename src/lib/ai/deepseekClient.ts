import { SYNCROGEST_TOOLS } from './toolDefinitions';
import { SYSTEM_PROMPT } from './systemPrompt';
import { executeTool } from '../syncrogest/executor';
import { READ_TOOLS } from './readTools';
import type { HistoryEntry } from '../types/chat';
import type { ToolCallResult, SyncrogestToolName } from '../types/tools';
import type { InterpretResult, ExecutedStep } from './claudeClient';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MAX_AUTO_STEPS = 10;
const TOOL_RESULT_MAX_CHARS = 8000;

type OpenAIMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export async function interpretWithDeepSeek(
  userMessage: string,
  history: HistoryEntry[],
): Promise<InterpretResult> {
  const tools = SYNCROGEST_TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    {
      role: 'user',
      content: `[Data odierna: ${new Date().toLocaleDateString('it-IT')}]\n\n${userMessage}`,
    },
  ];

  const executedSteps: ExecutedStep[] = [];

  for (let step = 0; step < MAX_AUTO_STEPS; step++) {
    const resp = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 4096,
      }),
    });

    if (!resp.ok) {
      throw new Error(`DeepSeek API error: ${resp.status} ${await resp.text()}`);
    }

    const data = (await resp.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: OpenAIToolCall[];
        };
      }>;
    };

    const message = data.choices?.[0]?.message;

    if (!message?.tool_calls?.length) {
      const text = message?.content ?? 'Nessuna risposta generata.';
      if (executedSteps.length > 0) {
        return { type: 'auto_executed', text, executedSteps };
      }
      return { type: 'text', text };
    }

    const call = message.tool_calls[0];
    const toolName = call.function.name as SyncrogestToolName;
    const toolInput = JSON.parse(call.function.arguments) as Record<string, unknown>;

    if (!READ_TOOLS.has(toolName)) {
      const toolCall: ToolCallResult = {
        toolName,
        toolInput,
        humanSummary: `Eseguire: ${toolName.replace(/_/g, ' ')} — ${JSON.stringify(toolInput)}`,
      };
      return {
        type: 'tool_call',
        toolCall,
        executedSteps: executedSteps.length > 0 ? executedSteps : undefined,
      };
    }

    // Auto-execute read tool
    const result = await executeTool(toolName, toolInput);
    executedSteps.push({ toolName, toolInput, result });

    // Feed result back (OpenAI agentic format)
    messages.push({
      role: 'assistant',
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    });
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result).slice(0, TOOL_RESULT_MAX_CHARS),
    });
  }

  return {
    type: 'auto_executed',
    text: 'Ho raggiunto il limite di operazioni automatiche. Prova a riformulare la domanda in modo più specifico.',
    executedSteps,
  };
}
