/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/chat/ChatMessages.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useBlockchain } from '@/app/hooks/useBlockchain';
import { useAI } from '@/app/providers/AIProvider';
import { ExtendedMessage } from '@/app/types/message';

export const ChatMessages = () => {
  const { messages } = useAI();
  const { getBalance, getTransactions } = useBlockchain();
  const endRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [actionResults, setActionResults] = useState<Record<string, any>>({});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Execute actions when messages change
  useEffect(() => {
    const executeActions = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newResults: Record<string, any> = { ...actionResults };
      let updated = false;

      for (const message of messages) {
        if (message.action && !actionResults[message.id]) {
          try {
            let result;
            switch (message.action) {
              case 'balance':
                // Get balance in SOL
                const solBalance = await getBalance();
                // Format the result to include both SOL value and source
                result = {
                  balance: solBalance,
                  formatted: solBalance.toFixed(6),
                  source: 'blockchain',
                };
                break;
              case 'transactions':
                const txs = await getTransactions();
                // Format transactions for display
                result = {
                  count: txs.length,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  transactions: txs.map((tx: any) => ({
                    signature: tx.signature,
                    blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown',
                    type: tx.type || 'Transaction',
                    fee: tx.fee ? `${(tx.fee / 1000000000).toFixed(6)} SOL` : 'Unknown',
                    successful: tx.successful ? 'Success' : 'Failed',
                    source: tx.source || 'Unknown'
                  })),
                  source: txs.length > 0 ? txs[0].source : 'Unknown'
                };
                break;
              default:
                result = 'Action not supported';
            }
            newResults[message.id] = result;
            updated = true;
          } catch (error) {
            console.error('Action failed:', error);
            newResults[message.id] = {
              error: true,
              message: error instanceof Error ? error.message : 'Failed to execute action'
            };
            updated = true;
          }
        }
      }

      if (updated) {
        setActionResults(newResults);
      }
    };

    executeActions();
  }, [messages, actionResults, getBalance, getTransactions]);

  // Format content for display based on action type
  const formatActionResult = (messageId: string, action: string) => {
    const result = actionResults[messageId];
    
    if (!result) return null;
    
    if (result.error) {
      return (
        <div className="text-red-500">Error: {result.message}</div>
      );
    }
    
    switch (action) {
      case 'balance':
        return (
          <div className="font-mono">
            <div className="flex items-center">
              <span className="text-lg font-semibold">{result.formatted}</span>
              <span className="ml-2 text-sm opacity-70">SOL</span>
            </div>
          </div>
        );
        
      case 'transactions':
        return (
          <div>
            <div className="mb-2 text-sm font-semibold">Found {result.count} transactions</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {result.transactions.slice(0, 5).map((tx: any, index: number) => (
                <div key={index} className="p-2 bg-black/10 dark:bg-white/5 rounded-md text-sm">
                  <div className="flex justify-between">
                    <a 
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono hover:underline text-xs overflow-hidden text-ellipsis"
                    >
                      {tx.signature.slice(0, 10)}...{tx.signature.slice(-10)}
                    </a>
                    <span className={`text-xs px-1 py-0.5 rounded ${tx.successful === 'Success' ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}>
                      {tx.successful}
                    </span>
                  </div>
                  <div className="mt-1 text-xs opacity-70 flex flex-wrap justify-between">
                    <span>{tx.type}</span>
                    <span>{tx.blockTime}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-70">Fee: {tx.fee}</div>
                </div>
              ))}
              {result.transactions.length > 5 && (
                <div className="text-center text-xs italic mt-2">
                  Showing 5 of {result.transactions.length} transactions
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="font-mono text-sm overflow-x-auto">
            {typeof result === 'object' 
              ? JSON.stringify(result, null, 2)
              : result.toString()}
          </div>
        );
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
          <p className="text-gray-500 dark:text-gray-400 max-w-md">Ask about your wallet balance, check transactions, or explore the Sonic SVM and Solana network.</p>
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
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-md text-gray-800 dark:text-gray-100'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.action && actionResults[message.id] && (
                <div className="mt-3 p-3 bg-black/10 dark:bg-white/10 rounded-lg">
                  <div className="text-xs font-semibold mb-1 opacity-70 flex justify-between items-center">
                    <span>{message.action.toUpperCase()} RESULT</span>
                    {actionResults[message.id].source && (
                      <span className="text-xs opacity-50">via {actionResults[message.id].source}</span>
                    )}
                  </div>
                  {formatActionResult(message.id, message.action)}
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