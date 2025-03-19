// app/types/ai.ts

export type AIProvider = 'deepseek' | 'google';

// app/types/chat.ts

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  aiProvider?: string;
  createdAt: number;
  lastActive: number;
}

// app/types/wallet.ts

export interface WalletInfo {
  address: string;
  chain: string;
  label?: string;
}

export interface TokenBalance {
  mint: string;
  symbol: string;
  name?: string;
  amount: number;
  decimals: number;
  usdValue?: number;
}

export interface NFTInfo {
  mint: string;
  name?: string;
  symbol?: string;
  image?: string;
  collection?: string;
}

export interface Transaction {
  signature: string;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  type: 'transfer' | 'swap' | 'stake' | 'unstake' | 'other';
  amount: number;
  token: string;
  fee: number;
  from?: string;
  to?: string;
}