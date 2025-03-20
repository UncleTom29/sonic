// src/components/chat/ChatInput.tsx
'use client';

import { useState, useRef } from 'react';
import { useChatHistory } from '@/app/hooks/useChatHistory';
import { ModelSelector } from './ModelSelector';
import { useAI } from '@/app/providers/AIProvider';
import { Message } from 'ai';
import { ExtendedMessage } from '@/app/types/message';
import { usePrivy } from '@privy-io/react-auth';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { messages, setMessages, model } = useAI();
  const { saveChat } = useChatHistory();
  const { user } = usePrivy();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    if (!user?.id) {
      alert("Please connect your wallet first");
      return;
    }
    
    const userMessage: ExtendedMessage = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
    };

    setMessages((current: Message[]) => [...current, userMessage]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          userId: user.id,
          model
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      const aiMessage: ExtendedMessage = {
        id: (Date.now() + 1).toString(),
        content: data.content || "I'm processing your request",
        role: 'assistant',
        action: data.action
      };
      
      setMessages((current: Message[]) => [...current, aiMessage]);
      await saveChat([...messages, userMessage, aiMessage]);
    } catch (error) {
      console.error('Submission error:', error);
      // Add error message to the chat
      setMessages((current: Message[]) => [
        ...current,
        {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I encountered an error processing your request. Please try again later.",
          role: 'assistant'
        }
      ]);
    } finally {
      setIsLoading(false);
      setInput('');
      formRef.current?.reset();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative">
      <ModelSelector />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about your wallet..."
        className="w-full p-4 pr-32 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500"
        disabled={isLoading || !user?.id}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading || !user?.id}
        className="absolute right-2 top-2 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}