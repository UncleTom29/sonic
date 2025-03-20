// src/components/chat/ChatMessages.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useBlockchain } from '@/app/hooks/useBlockchain';
import { useAI } from '@/app/providers/AIProvider';
import { ExtendedMessage } from '@/app/types/message';

export const ChatMessages = () => {
  const { messages } = useAI();
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-4">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">Welcome to SonicHub</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">Ask about your wallet balance, check transactions, or explore the Solana network.</p>
        </div>
      ) : (
        messages?.map((message: ExtendedMessage) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xl p-4 rounded-2xl ${
              message.role === 'user' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-md dark:text-gray-100'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.action && (
                <div className="mt-3 p-3 bg-black/10 dark:bg-white/10 rounded-lg">
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    {message.action.toUpperCase()} RESULT
                  </div>
                  <div className="font-mono text-sm overflow-x-auto">
                    {JSON.stringify(executeAction(message.action), null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
};
