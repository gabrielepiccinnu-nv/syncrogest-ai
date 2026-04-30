'use client';

import type { ChatMessage } from '@/lib/types/chat';
import ReactMarkdown from 'react-markdown';
import { PreviewCard } from './PreviewCard';
import { ResultCard } from './ResultCard';

interface MessageBubbleProps {
  message: ChatMessage;
  onConfirm: (
    id: string,
    toolName: string,
    input: Record<string, unknown>,
  ) => void;
  onCancel: (id: string) => void;
}

export function MessageBubble({ message, onConfirm, onCancel }: MessageBubbleProps) {
  if (message.type === 'user-text') {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'ai-preview') {
    return (
      <div className="flex justify-start">
        <PreviewCard
          message={message}
          onConfirm={(id, toolName, input) => onConfirm(id, toolName, input)}
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (message.type === 'ai-result') {
    return (
      <div className="flex justify-start">
        <ResultCard message={message} />
      </div>
    );
  }

  if (message.type === 'ai-confirmed') {
    return (
      <div className="flex justify-start">
        <div className="text-xs text-gray-400 italic px-2">Esecuzione in corso...</div>
      </div>
    );
  }

  if (message.type === 'ai-error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-xl bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-2 text-sm">
          Errore: {message.error}
        </div>
      </div>
    );
  }

  if (message.type === 'ai-cancelled') {
    return (
      <div className="flex justify-start">
        <div className="text-xs text-gray-400 italic px-2">{message.content}</div>
      </div>
    );
  }

  // ai-text
  return (
    <div className="flex justify-start">
      <div className="max-w-xl bg-gray-100 text-gray-800 rounded-lg px-4 py-2 text-sm prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ ...props }) => <h1 className="text-lg font-bold mt-3 mb-2" {...props} />,
            h2: ({ ...props }) => <h2 className="text-base font-bold mt-2 mb-1.5" {...props} />,
            h3: ({ ...props }) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
            p: ({ ...props }) => <p className="mb-2" {...props} />,
            ul: ({ ...props }) => <ul className="list-disc list-inside mb-2 ml-2" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal list-inside mb-2 ml-2" {...props} />,
            li: ({ ...props }) => <li className="mb-1" {...props} />,
            strong: ({ ...props }) => <strong className="font-bold" {...props} />,
            em: ({ ...props }) => <em className="italic" {...props} />,
            code: ({ ...props }) => <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />,
            pre: ({ ...props }) => <pre className="bg-gray-800 text-gray-100 p-3 rounded overflow-auto text-xs mb-2" {...props} />,
            table: ({ ...props }) => <table className="w-full border-collapse border border-gray-300 my-2" {...props} />,
            thead: ({ ...props }) => <thead className="bg-gray-200" {...props} />,
            tbody: ({ ...props }) => <tbody {...props} />,
            tr: ({ ...props }) => <tr className="border border-gray-300" {...props} />,
            th: ({ ...props }) => <th className="border border-gray-300 px-2 py-1 text-left font-semibold" {...props} />,
            td: ({ ...props }) => <td className="border border-gray-300 px-2 py-1" {...props} />,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
