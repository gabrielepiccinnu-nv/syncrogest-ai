'use client';

import type { ChatMessage } from '@/lib/types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm">
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
      <div className="flex justify-start pl-1">
        <ResultCard message={message} />
      </div>
    );
  }

  if (message.type === 'ai-confirmed') {
    return (
      <div className="flex justify-start">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 italic px-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
          Esecuzione in corso...
        </div>
      </div>
    );
  }

  if (message.type === 'ai-error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm">
          <span className="font-medium">Errore: </span>{message.error}
        </div>
      </div>
    );
  }

  if (message.type === 'ai-cancelled') {
    return (
      <div className="flex justify-start">
        <div className="text-xs text-gray-400 italic px-1">{message.content}</div>
      </div>
    );
  }

  // ai-text
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ ...props }) => <h1 className="text-base font-bold mt-3 mb-2 text-gray-900" {...props} />,
            h2: ({ ...props }) => <h2 className="text-sm font-bold mt-2 mb-1.5 text-gray-900" {...props} />,
            h3: ({ ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-800" {...props} />,
            p: ({ ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
            ul: ({ ...props }) => <ul className="list-disc list-outside mb-2 ml-4 space-y-0.5" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal list-outside mb-2 ml-4 space-y-0.5" {...props} />,
            li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
            strong: ({ ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
            em: ({ ...props }) => <em className="italic text-gray-600" {...props} />,
            code: ({ ...props }) => <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />,
            pre: ({ ...props }) => <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-auto text-xs mb-2" {...props} />,
            hr: ({ ...props }) => <hr className="my-3 border-gray-200" {...props} />,
            blockquote: ({ ...props }) => (
              <blockquote className="border-l-3 border-blue-300 bg-blue-50 pl-3 py-1 my-2 rounded-r text-gray-600 italic text-xs" {...props} />
            ),
            table: ({ ...props }) => (
              <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-xs" {...props} />
              </div>
            ),
            thead: ({ ...props }) => <thead className="bg-gray-50" {...props} />,
            tbody: ({ ...props }) => <tbody className="divide-y divide-gray-100" {...props} />,
            tr: ({ ...props }) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
            th: ({ ...props }) => <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide" {...props} />,
            td: ({ ...props }) => <td className="px-3 py-2 text-gray-700" {...props} />,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
