// src/app/hooks/useBlockchain.ts
import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import { ShyftSdk, Network } from '@shyft-to/js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const shyft = new ShyftSdk({ 
  apiKey: process.env.NEXT_PUBLIC_SHYFT_API_KEY!, 
  network: Network.Mainnet 
});

export const useBlockchain = () => {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getBalance = async () => {
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    
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
        const { solana } = await moralisResponse.json();
        return solana;
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
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try Shyft first
      const transactions = await shyft.wallet.parsedTransactionHistory({
        wallet: user.wallet.address,
        limit,
        network: Network.Mainnet
      });

      if (transactions.length > 0) return transactions;

      // Fallback to Helius if Shyft fails
      const heliusResponse = await fetch(
        `https://api.helius.xyz/v0/addresses/${user.wallet.address}/transactions?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}&limit=${limit}`
      );

      if (heliusResponse.ok) {
        return await heliusResponse.json();
      }

      // Final fallback to direct RPC
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
      const signatures = await connection.getConfirmedSignaturesForAddress2(
        new PublicKey(user.wallet.address),
        { limit }
      );

      return await Promise.all(
        signatures.map(async (sig) => {
          const tx = await connection.getTransaction(sig.signature);
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            fee: tx?.meta?.fee || 0,
            successful: !sig.err,
            details: tx
          };
        })
      );

    } catch (err) {
      setError('Failed to fetch transactions');
      console.error(err);
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