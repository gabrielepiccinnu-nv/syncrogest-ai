'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { ModelSelector } from './ModelSelector';
import { MessageList } from './MessageList';

export function ChatInterface() {
  const { messages, engine, setEngine, isLoading, sendMessage, confirmAction, cancelAction } =
    useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">Syncrogest AI</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            Beta
          </span>
        </div>
        <ModelSelector value={engine} onChange={setEngine} />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <MessageList
          messages={messages}
          onConfirm={confirmAction}
          onCancel={cancelAction}
        />
        {isLoading && (
          <div className="flex justify-start mt-3">
            <div className="text-sm text-gray-400 italic animate-pulse px-2">
              {engine === 'claude' ? 'Claude' : 'DeepSeek'} sta elaborando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t bg-white px-4 py-3 flex gap-2 items-end"
      >
        <textarea
          className="flex-1 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi un messaggio o incolla un'email..."
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Invia
        </button>
      </form>
    </div>
  );
}
