// src/components/chat/ChatInput.tsx
'use client';

import { useState, useRef } from 'react';
import { useChatHistory } from '@/app/hooks/useChatHistory';
import { ModelSelector } from './ModelSelector';
import { useAI } from '@/app/providers/AIProvider';
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

    // Clear input immediately for better UX
    setInput('');
    
    // Add user message to messages
    setMessages((current: ExtendedMessage[]) => [...current, userMessage]);
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
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      if (reader) {
        const aiMessage: ExtendedMessage = {
          id: (Date.now() + 1).toString(),
          content: "I'm processing your request...",
          role: 'assistant',
        };
        
        // Add initial AI message to show loading state
        setMessages((current) => [...current, aiMessage]);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                // Update the AI message with the latest content
                setMessages((current: ExtendedMessage[]) => {
                  const updatedMessages = [...current];
                  const lastMessage = updatedMessages[updatedMessages.length - 1];
                  
                  if (lastMessage.role === 'assistant') {
                    updatedMessages[updatedMessages.length - 1] = {
                      ...lastMessage,
                      content: data.content || lastMessage.content,
                      action: data.action
                    };
                  }
                  
                  return updatedMessages;
                });
              } catch (e) {
                console.log('Error parsing JSON:', e);
              }
            }
          }
        }
      }
      
      // Save the chat after completion
      await saveChat([...messages, userMessage]);
    } catch (error) {
      console.error('Submission error:', error);
      // Add error message to the chat
      setMessages((current: ExtendedMessage[]) => [
        ...current,
        {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I encountered an error processing your request. Please try again later.",
          role: 'assistant'
        }
      ]);
    } finally {
      setIsLoading(false);
      formRef.current?.reset();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative mt-auto p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-3xl mx-auto">
        <ModelSelector />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={user?.id ? "Ask about your wallet..." : "Connect wallet to start chatting"}
          className="w-full p-4 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={isLoading || !user?.id}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || !user?.id}
          className="absolute right-6 top-6 py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>Send</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </div>
          )}
        </button>
      </div>
    </form>
  );
}