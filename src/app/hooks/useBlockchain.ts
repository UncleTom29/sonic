import { usePrivy } from '@privy-io/react-auth';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const useBlockchain = () => {
  const { user } = usePrivy();
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

  const getBalance = async () => {
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    const balance = await connection.getBalance(new PublicKey(user.wallet.address));
    return balance / LAMPORTS_PER_SOL;
  };

  const getTransactions = async (limit = 10) => {
    if (!user?.wallet?.address) throw new Error('Wallet not connected');
    return connection.getConfirmedSignaturesForAddress2(
      new PublicKey(user.wallet.address),
      { limit }
    );
  };

  const getNetworkStatus = async () => connection.getClusterNodes();

  return { getBalance, getTransactions, getNetworkStatus };
};