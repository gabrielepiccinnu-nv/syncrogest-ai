'use client';

import { useState, useCallback } from 'react';
import type {
  ChatMessage,
  AIEngine,
  HistoryEntry,
  ChatApiResponse,
  ExecuteApiResponse,
} from '@/lib/types/chat';
import type { SyncrogestToolName } from '@/lib/types/tools';

function uid() {
  return crypto.randomUUID();
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [engine, setEngine] = useState<AIEngine>('deepseek');
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      addMessage({
        id: uid(),
        type: 'user-text',
        role: 'user',
        content: text,
        timestamp: new Date(),
      });
      setIsLoading(true);

      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, engine, history }),
        });

        const data = (await resp.json()) as ChatApiResponse;

        if (data.type === 'preview' && data.toolName && data.toolInput) {
          addMessage({
            id: uid(),
            type: 'ai-preview',
            role: 'assistant',
            toolName: data.toolName,
            toolInput: data.toolInput,
            humanSummary: data.humanSummary ?? '',
            timestamp: new Date(),
          });
          setHistory((prev) => [...prev, { role: 'user', content: text }]);
        } else if (data.type === 'text' || data.type === 'auto_executed') {
          const content = data.text ?? '';
          addMessage({
            id: uid(),
            type: 'ai-text',
            role: 'assistant',
            content,
            timestamp: new Date(),
          });
          setHistory((prev) => [
            ...prev,
            { role: 'user', content: text },
            { role: 'assistant', content },
          ]);
        } else if (data.type === 'error') {
          addMessage({
            id: uid(),
            type: 'ai-error',
            role: 'assistant',
            error: data.error ?? 'Errore sconosciuto',
            timestamp: new Date(),
          });
        }
      } catch {
        addMessage({
          id: uid(),
          type: 'ai-error',
          role: 'assistant',
          error: 'Errore di rete — riprova.',
          timestamp: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [engine, history, addMessage],
  );

  const confirmAction = useCallback(
    async (
      messageId: string,
      toolName: SyncrogestToolName,
      toolInput: Record<string, unknown>,
    ) => {
      const currentEngine = engine;
      const currentHistory = history;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.type === 'ai-preview'
            ? ({
                id: m.id,
                type: 'ai-confirmed' as const,
                role: 'assistant' as const,
                toolName: m.toolName,
                timestamp: new Date(),
              } satisfies ChatMessage)
            : m,
        ),
      );
      setIsLoading(true);

      try {
        const resp = await fetch('/api/syncrogest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName, toolInput }),
        });

        const data = (await resp.json()) as ExecuteApiResponse;
        const resultJson = JSON.stringify(data.success ? data.data : { errore: data.error });

        const historyWithResult: HistoryEntry[] = [
          ...currentHistory,
          {
            role: 'assistant',
            content: `Ho eseguito il tool ${toolName} con input ${JSON.stringify(toolInput)}. Risultato API: ${resultJson}`,
          },
        ];

        // Call AI to interpret the tool result
        const interpretResp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Presenta in modo chiaro e sintetico i risultati ottenuti, evidenziando le informazioni più rilevanti.',
            engine: currentEngine,
            history: historyWithResult,
          }),
        });

        const interpretData = (await interpretResp.json()) as ChatApiResponse;

        if (interpretData.type === 'text' && interpretData.text) {
          addMessage({
            id: uid(),
            type: 'ai-text',
            role: 'assistant',
            content: interpretData.text,
            timestamp: new Date(),
          });
          setHistory([
            ...historyWithResult,
            { role: 'assistant', content: interpretData.text },
          ]);
        } else {
          // Fallback: show raw result
          addMessage({
            id: uid(),
            type: 'ai-result',
            role: 'assistant',
            toolName,
            result: data.success ? data.data : { errore: data.error },
            timestamp: new Date(),
          });
          setHistory(historyWithResult);
        }
      } catch {
        addMessage({
          id: uid(),
          type: 'ai-error',
          role: 'assistant',
          error: 'Errore durante l\'esecuzione — riprova.',
          timestamp: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, engine, history],
  );

  const cancelAction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? ({
              id: m.id,
              type: 'ai-cancelled' as const,
              role: 'assistant' as const,
              content: 'Azione annullata.',
              timestamp: new Date(),
            } satisfies ChatMessage)
          : m,
      ),
    );
  }, []);

  return { messages, engine, setEngine, isLoading, sendMessage, confirmAction, cancelAction };
}
