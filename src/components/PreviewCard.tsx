'use client';

import type { AIPreviewMessage } from '@/lib/types/chat';

interface PreviewCardProps {
  message: AIPreviewMessage;
  onConfirm: (
    id: string,
    toolName: AIPreviewMessage['toolName'],
    input: Record<string, unknown>,
  ) => void;
  onCancel: (id: string) => void;
}

export function PreviewCard({ message, onConfirm, onCancel }: PreviewCardProps) {
  return (
    <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 max-w-xl">
      <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
        Azione proposta
      </div>
      <p className="text-gray-800 mb-3">{message.humanSummary}</p>

      <details className="mb-3">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
          Dettagli tecnici
        </summary>
        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify({ tool: message.toolName, params: message.toolInput }, null, 2)}
        </pre>
      </details>

      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(message.id, message.toolName, message.toolInput)}
          className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
        >
          Conferma
        </button>
        <button
          onClick={() => onCancel(message.id)}
          className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
