'use client';

import type { AIEngine } from '@/lib/types/chat';

interface ModelSelectorProps {
  value: AIEngine;
  onChange: (engine: AIEngine) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AIEngine)}
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="claude">Claude (Anthropic)</option>
      <option value="deepseek">DeepSeek</option>
    </select>
  );
}
