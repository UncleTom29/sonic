// src/app/hooks/useBlockchain.ts
import { usePrivy } from '@privy-io/react-auth';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';

export const useBlockchain = () => {
  const { user } = usePrivy();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      setConnection(new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL));
    }
  }, []);

  const getBalance = async () => {
    if (!connection) return 0;
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const balance = await connection.getBalance(new PublicKey(user.wallet.address));
      return balance / LAMPORTS_PER_SOL;
    } catch (err) {
      setError('Failed to fetch balance');
      console.error(err);
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactions = async (limit = 10) => {
    if (!connection) return [];
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const signatures = await connection.getConfirmedSignaturesForAddress2(
        new PublicKey(user.wallet.address),
        { limit }
      );
      
      // Get transaction details for each signature
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature);
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              confirmationStatus: sig.confirmationStatus,
              fee: tx?.meta?.fee || 0,
              successful: !sig.err,
            };
          } catch (err) {
            console.error('Error fetching transaction:', err);
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              confirmationStatus: sig.confirmationStatus,
              fee: 0,
              successful: !sig.err,
            };
          }
        })
      );
      
      return transactions;
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

//   const getNetworkStatus = async () => {
//     if (!connection) return { status: 'disconnected' };
    
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const [health, validators, version] = await Promise.all([
//         connection.getVoteAccounts(),
//         connection.getVersion(),
//         connection.getEpochInfo(),
//       ]);
      
//       return {
//         status: 'connected',
//         health,
//         validators: {
//           current: validators.current.length,
//           delinquent: validators.delinquent.length,
//         },
//         version,
//         epoch: epoch.epoch,
//         slotIndex: epoch.slotIndex,
//         slotsInEpoch: epoch.slotsInEpoch,
//       };
//     } catch (err) {
//       setError('Failed to fetch network status');
//       console.error(err);
//       return { status: 'error' };
//     } finally {
//       setIsLoading(false);
//     }
//   };

  return { 
    getBalance, 
    getTransactions, 
    // getNetworkStatus,
    isLoading,
    error
  };
};