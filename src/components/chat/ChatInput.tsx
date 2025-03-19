'use client';

import { useUIState, useActions } from 'ai/rsc';
import { useRef, useState } from 'react';
import { useChatHistory } from '@/app/hooks/useChatHistory';
import { ModelSelector } from './ModelSelector';
import { Message } from 'ai';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { submit } = useActions();
  const [messages, setMessages] = useUIState<Message[]>();
  const { saveChat } = useChatHistory();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userMessage = {
      id: Date.now().toString(),
      content: input,
      role: 'user' as const,
    };

    setMessages(current => [...(current || []), userMessage]);
    
    try {
      const response = await submit(userMessage);
      setMessages(current => [...(current || []), response]);
      await saveChat([...(messages || []), userMessage, response]);
    } catch (error) {
      console.error('Submission error:', error);
    }
    
    setInput('');
    formRef.current?.reset();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative">
      <ModelSelector />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about your wallet..."
        className="w-full p-4 pr-32 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={!input}
        className="absolute right-2 top-2 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}