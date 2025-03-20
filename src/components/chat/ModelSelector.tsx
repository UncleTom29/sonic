// src/components/chat/ModelSelector.tsx
'use client';

import { useAI } from '@/app/providers/AIProvider';

export function ModelSelector() {
  const { model, setModel } = useAI();

  return (
    <div className="absolute left-2 top-2">
      <select
        value={model}
        onChange={(e) => setModel(e.target.value as 'deepseek' | 'google')}
        className="text-sm bg-white border rounded px-2 py-1"
      >
        <option value="deepseek">DeepSeek</option>
        <option value="google">Google AI</option>
      </select>
    </div>
  );
}