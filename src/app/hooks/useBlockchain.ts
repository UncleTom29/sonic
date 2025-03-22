/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/hooks/useBlockchain.ts
import { usePrivy } from '@privy-io/react-auth';
import { useState, useRef } from 'react';
import { ShyftSdk, Network } from '@shyft-to/js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const shyft = new ShyftSdk({ 
  apiKey: process.env.NEXT_PUBLIC_SHYFT_API_KEY!, 
  network: Network.Mainnet 
});


export interface BlockchainParams {
  limit?: number;
  network?: string;
  detail?: string;
  timeframe?: string;
  type?: string;
  sort?: 'asc' | 'desc';
}

export const useBlockchain = () => {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add state to track last API call time
  const lastCallTimeRef = useRef<Record<string, number>>({
    balance: 0,
    transactions: 0,
    network: 0
  });
  
  // API rate limit constants (milliseconds)
  const API_RATE_LIMIT = 10000; // 10 seconds between calls

  const checkRateLimit = (operation: 'balance' | 'transactions' | 'network'): boolean => {
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
          return {
            balance: parseFloat(data.solana),
            source: 'moralis'
          };
        }
        if (data.lamports) {
          return {
            balance: parseFloat(data.lamports) / LAMPORTS_PER_SOL,
            source: 'moralis'
          };
        }
      }

      // Fallback to Shyft if Moralis fails
      const shyftBalance = await shyft.wallet.getBalance({ 
        wallet: user.wallet.address 
      });
      return {
        balance: shyftBalance / LAMPORTS_PER_SOL,
        source: 'shyft'
      };

    } catch (err) {
      // Final fallback to direct RPC
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
        const balance = await connection.getBalance(new PublicKey(user.wallet.address));
        return {
          balance: balance / LAMPORTS_PER_SOL,
          source: 'rpc'
        };
      } catch (finalErr) {
        setError('Failed to fetch balance');
        console.error(finalErr);
        throw new Error('Failed to fetch balance from all available sources');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactions = async (params: BlockchainParams = {}) => {
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    
    // Check rate limit
    if (!checkRateLimit('transactions')) {
      throw new Error('Please wait before making another request');
    }
    
    setIsLoading(true);
    setError(null);
    
    const { 
      limit = 10,
      type,
      timeframe,
      sort = 'desc'
    } = params;
    
    try {
      // Try Helius first
      try {
        let heliusUrl = `https://api.helius.xyz/v0/addresses/${user.wallet.address}/transactions?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}&limit=${limit}`;
        
        // Add additional params if provided
        if (sort) {
          heliusUrl += `&order=${sort}`;
        }
        
        const heliusResponse = await fetch(heliusUrl);

        if (heliusResponse.ok) {
          let heliusTxs = await heliusResponse.json();
          
          // Filter by type if specified
          if (type && type !== 'all') {
            heliusTxs = heliusTxs.filter((tx: any) => 
              tx.type?.toLowerCase().includes(type.toLowerCase())
            );
          }
          
          // Filter by timeframe if specified
          if (timeframe) {
            const now = Date.now();
            let timeFilter: number;
            
            // Parse timeframe (last day, week, month)
            switch(timeframe.toLowerCase()) {
              case 'day':
              case 'today':
              case 'yesterday':
                timeFilter = now - (24 * 60 * 60 * 1000);
                break;
              case 'week':
                timeFilter = now - (7 * 24 * 60 * 60 * 1000);
                break;
              case 'month':
                timeFilter = now - (30 * 24 * 60 * 60 * 1000);
                break;
              default:
                // Try to parse as number of days
                const days = parseInt(timeframe);
                if (!isNaN(days)) {
                  timeFilter = now - (days * 24 * 60 * 60 * 1000);
                } else {
                  timeFilter = 0; // No filtering
                }
            }
            
            if (timeFilter > 0) {
              heliusTxs = heliusTxs.filter((tx: any) => 
                tx.timestamp && tx.timestamp >= timeFilter
              );
            }
          }
          
          // Standardize the Helius response format
          return {
            transactions: heliusTxs.map((tx: any) => ({
              signature: tx.signature,
              blockTime: tx.timestamp ? tx.timestamp / 1000 : undefined, // Convert ms to seconds if timestamp exists
              fee: tx.fee,
              successful: !tx.err,
              type: tx.type || 'unknown',
              source: 'helius'
            })),
            count: heliusTxs.length,
            source: 'helius'
          };
        }
      } catch (heliusError) {
        console.error('Helius API error:', heliusError);
        // Continue to next provider
      }

      // Try Shyft next
      try {
        const shyftParams: any = {
          wallet: user.wallet.address,
          limit,
          network: Network.Mainnet
        };
        
        // Add sort parameter
        if (sort) {
          shyftParams.sortOrder = sort.toUpperCase();
        }
        
        const shyftTransactions = await shyft.wallet.parsedTransactionHistory(shyftParams);
        
        if (shyftTransactions.length > 0) {
          // Filter transactions if needed
          let filteredTxs = [...shyftTransactions];
          
          // Filter by type if specified
          if (type && type !== 'all') {
            filteredTxs = filteredTxs.filter((tx: any) => 
              tx.type?.toLowerCase().includes(type.toLowerCase())
            );
          }
          
          // Filter by timeframe if specified
          if (timeframe) {
            const now = Date.now();
            let timeFilter: number;
            
            // Parse timeframe
            switch(timeframe.toLowerCase()) {
              case 'day':
              case 'today':
              case 'yesterday':
                timeFilter = now - (24 * 60 * 60 * 1000);
                break;
              case 'week':
                timeFilter = now - (7 * 24 * 60 * 60 * 1000);
                break;
              case 'month':
                timeFilter = now - (30 * 24 * 60 * 60 * 1000);
                break;
              default:
                // Try to parse as number of days
                const days = parseInt(timeframe);
                if (!isNaN(days)) {
                  timeFilter = now - (days * 24 * 60 * 60 * 1000);
                } else {
                  timeFilter = 0; // No filtering
                }
            }
            
            if (timeFilter > 0) {
              filteredTxs = filteredTxs.filter((tx: any) => {
                const txTime = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
                return txTime >= timeFilter;
              });
            }
          }
          
          // Standardize the Shyft response format
          return {
            transactions: filteredTxs.map((tx: any) => ({
              signature: tx.signature,
              blockTime: tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : undefined,
              fee: tx.fee,
              successful: tx.status === 'success',
              type: tx.type || 'unknown',
              source: 'shyft'
            })),
            count: filteredTxs.length,
            source: 'shyft'
          };
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
      
      // Apply sort if specified and supported
      if (sort === 'asc') {
        signatures.reverse();
      }

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

      return {
        transactions,
        count: transactions.length,
        source: 'rpc'
      };

    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Transaction fetch error:', err);
      throw new Error('Failed to fetch transactions from all available sources');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getNetworkStatus = async () => {
    if (!checkRateLimit('network')) {
      throw new Error('Please wait before making another request');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
      
      // Get cluster version
      const version = await connection.getVersion();
      
      // Get recent performance samples
      const perfSamples = await connection.getRecentPerformanceSamples(5);
      
      // Calculate average TPS
      const avgTps = perfSamples.length > 0 
        ? perfSamples.reduce((sum, sample) => sum + sample.numTransactions / sample.samplePeriodSecs, 0) / perfSamples.length
        : 0;
      
      // Get latest block
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      
      return {
        status: 'online',
        version: version['solana-core'],
        currentSlot: slot,
        avgTps: avgTps.toFixed(2),
        latestBlockTime: blockTime ? new Date(blockTime * 1000).toISOString() : null,
        source: 'rpc'
      };
    } catch (err) {
      setError('Failed to fetch network status');
      console.error('Network status fetch error:', err);
      throw new Error('Failed to fetch network status');
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    getBalance, 
    getTransactions,
    getNetworkStatus,
    isLoading,
    error
  };
};