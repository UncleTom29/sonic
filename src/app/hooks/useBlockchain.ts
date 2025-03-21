// src/app/hooks/useBlockchain.ts
import { usePrivy } from '@privy-io/react-auth';
import { useState, useRef } from 'react';
import { ShyftSdk, Network } from '@shyft-to/js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const shyft = new ShyftSdk({ 
  apiKey: process.env.NEXT_PUBLIC_SHYFT_API_KEY!, 
  network: Network.Mainnet 
});

// Add debounce function
// const debounce = (func: Function, wait: number) => {
//   let timeout: NodeJS.Timeout | null = null;
  
//   return function executedFunction(...args: any[]) {
//     const later = () => {
//       timeout = null;
//       func(...args);
//     };
    
//     if (timeout) {
//       clearTimeout(timeout);
//     }
//     timeout = setTimeout(later, wait);
//   };
// };

export const useBlockchain = () => {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add state to track last API call time
  const lastCallTimeRef = useRef<Record<string, number>>({
    balance: 0,
    transactions: 0
  });
  
  // API rate limit constants (milliseconds)
  const API_RATE_LIMIT = 10000; // 5 seconds between calls

  const checkRateLimit = (operation: 'balance' | 'transactions'): boolean => {
    const now = Date.now();
    const lastCall = lastCallTimeRef.current[operation];
    
    if (now - lastCall < API_RATE_LIMIT) {
      console.log(`Rate limiting ${operation} call`);
      return false;
    }
    
    lastCallTimeRef.current[operation] = now;
    return true;
  };

  const getBalance = async () => {
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    
    // Check rate limit
    if (!checkRateLimit('balance')) {
      throw new Error('Please wait before making another request');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
         // Try Moralis first
         const moralisResponse = await fetch(
          `https://solana-gateway.moralis.io/account/mainnet/${user.wallet.address}/balance`,
          {
            headers: {
              'accept': 'application/json',
              'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY!
            }
          }
        );
  
        if (moralisResponse.ok) {
          const data = await moralisResponse.json();
          // Handle the specific Moralis response format
          if (data.solana) {
            return parseFloat(data.solana);
          }
          if (data.lamports) {
            return parseFloat(data.lamports) / LAMPORTS_PER_SOL;
          }
        }
  

      // Fallback to Shyft if Moralis fails
      const shyftBalance = await shyft.wallet.getBalance({ 
        wallet: user.wallet.address 
      });
      return shyftBalance / LAMPORTS_PER_SOL;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // Final fallback to direct RPC
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
        const balance = await connection.getBalance(new PublicKey(user.wallet.address));
        return balance / LAMPORTS_PER_SOL;
      } catch (finalErr) {
        setError('Failed to fetch balance');
        console.error(finalErr);
        return 0;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactions = async (limit = 10) => {
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    
    // Check rate limit
    if (!checkRateLimit('transactions')) {
      throw new Error('Please wait before making another request');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try Helius first
      try {
        const heliusResponse = await fetch(
          `https://api.helius.xyz/v0/addresses/${user.wallet.address}/transactions?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}&limit=${limit}`
        );

        if (heliusResponse.ok) {
          const heliusTxs = await heliusResponse.json();
          // Standardize the Helius response format
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return heliusTxs.map((tx: any) => ({
            signature: tx.signature,
            blockTime: tx.timestamp ? tx.timestamp / 1000 : undefined, // Convert ms to seconds if timestamp exists
            fee: tx.fee,
            successful: !tx.err,
            type: tx.type || 'unknown',
            source: 'helius'
          }));
        }
      } catch (heliusError) {
        console.error('Helius API error:', heliusError);
        // Continue to next provider
      }

      // Try Shyft next
      try {
        const shyftTransactions = await shyft.wallet.parsedTransactionHistory({
          wallet: user.wallet.address,
          limit,
          network: Network.Mainnet
        });

        if (shyftTransactions.length > 0) {
          // Standardize the Shyft response format
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return shyftTransactions.map((tx: any) => ({
            signature: tx.signature,
            blockTime: tx.timestamp ? tx.timestamp / 1000 : undefined,
            fee: tx.fee,
            successful: tx.status === 'success',
            type: tx.type || 'unknown',
            source: 'shyft'
          }));
        }
      } catch (shyftError) {
        console.error('Shyft API error:', shyftError);
        // Continue to final fallback
      }

      // Final fallback to direct RPC
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(user.wallet.address),
        { limit }
      );

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              fee: tx?.meta?.fee || 0,
              successful: !sig.err,
              type: 'transaction',
              source: 'rpc'
            };
          } catch (err) {
            console.error(`Error fetching transaction ${sig.signature}:`, err);
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              successful: !sig.err,
              source: 'rpc',
              error: 'Failed to fetch transaction details'
            };
          }
        })
      );

      return transactions;

    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Transaction fetch error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    getBalance, 
    getTransactions, 
    isLoading,
    error
  };
};