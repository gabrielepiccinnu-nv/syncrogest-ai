'use client';

import type { AIResultMessage } from '@/lib/types/chat';

interface ResultCardProps {
  message: AIResultMessage;
}

export function ResultCard({ message }: ResultCardProps) {
  const result = message.result as Record<string, unknown> | null;
  const isError = result && 'errore' in result;

  return (
    <div
      className={`border rounded-lg p-4 max-w-xl ${
        isError
          ? 'border-red-300 bg-red-50'
          : 'border-green-300 bg-green-50'
      }`}
    >
      <div
        className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
          isError ? 'text-red-700' : 'text-green-700'
        }`}
      >
        {isError ? 'Errore' : 'Completato'}
      </div>
      <pre className="text-xs bg-white border border-gray-200 p-2 rounded overflow-auto max-h-60">
        {JSON.stringify(message.result, null, 2)}
      </pre>
    </div>
  );
}
