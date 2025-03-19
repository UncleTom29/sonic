'use client';

import { useAIState } from 'ai/rsc';

export function ModelSelector() {
  const [aiState, setAIState] = useAIState<{ model?: string }>();

  const handleModelChange = (model: 'deepseek' | 'google') => {
    setAIState({ ...aiState, model });
  };

  return (
    <div className="absolute left-2 top-2">
      <select
        value={aiState.model || 'deepseek'}
        onChange={(e) => handleModelChange(e.target.value as 'deepseek' | 'google')}
        className="text-sm bg-white border rounded px-2 py-1"
      >
        <option value="deepseek">DeepSeek</option>
        <option value="google">Google AI</option>
      </select>
    </div>
  );
}