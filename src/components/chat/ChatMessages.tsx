'use client';

import { useUIState } from 'ai/rsc';
import { useEffect, useRef } from 'react';
import { useBlockchain } from '@/app/hooks/useBlockchain';
import { Message } from 'ai';

export const ChatMessages = () => {
  const [messages] = useUIState<Message[]>();
  const { getBalance, getTransactions } = useBlockchain();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeAction = async (action: string) => {
    try {
      switch (action) {
        case 'balance':
          return await getBalance();
        case 'transactions':
          return await getTransactions();
        default:
          return 'Action not supported';
      }
    } catch (error) {
      console.error('Action failed:', error);
      return 'Failed to execute action';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages?.map((message: Message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-xl p-4 rounded-lg ${
            message.role === 'user' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-50 border'
          }`}>
            <p>{message.content}</p>
            {message.action && (
              <div className="mt-2 p-2 bg-white/10 rounded">
                {JSON.stringify(executeAction(message.action))}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};