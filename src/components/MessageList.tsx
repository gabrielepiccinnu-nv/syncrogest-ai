'use client';

import type { ChatMessage } from '@/lib/types/chat';
import type { SyncrogestToolName } from '@/lib/types/tools';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  onConfirm: (
    id: string,
    toolName: SyncrogestToolName,
    input: Record<string, unknown>,
  ) => void;
  onCancel: (id: string) => void;
}

export function MessageList({ messages, onConfirm, onCancel }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-16">
        <div className="text-4xl mb-4">🤖</div>
        <p className="text-lg font-medium text-gray-500">Syncrogest AI Assistant</p>
        <p className="text-sm mt-2 max-w-sm">
          Scrivi un messaggio o incolla un&apos;email. L&apos;AI interpreterà l&apos;azione e la eseguirà su Syncrogest dopo la tua conferma.
        </p>
        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p>Esempi:</p>
          <p className="italic">"Crea un intervento urgente per Rossi domani mattina"</p>
          <p className="italic">"Mostra i ticket aperti di questa settimana"</p>
          <p className="italic">"Lista gli interventi del cliente Bianchi srl"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onConfirm={(id, toolName, input) =>
            onConfirm(id, toolName as SyncrogestToolName, input)
          }
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
