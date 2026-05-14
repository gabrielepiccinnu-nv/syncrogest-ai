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
    <div className="border border-amber-200 bg-amber-50 rounded-2xl rounded-tl-sm p-4 max-w-md shadow-sm">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs flex-shrink-0">!</span>
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Azione proposta</span>
      </div>

      <p className="text-sm text-gray-800 mb-3 leading-relaxed">{message.humanSummary}</p>

      <details className="mb-3">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">
          Dettagli tecnici
        </summary>
        <pre className="mt-1.5 text-xs bg-white border border-gray-200 p-2 rounded overflow-auto max-h-40 text-gray-600">
          {JSON.stringify({ tool: message.toolName, params: message.toolInput }, null, 2)}
        </pre>
      </details>

      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(message.id, message.toolName, message.toolInput)}
          className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
        >
          Conferma
        </button>
        <button
          onClick={() => onCancel(message.id)}
          className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
