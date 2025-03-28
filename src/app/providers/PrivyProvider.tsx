// app/providers/PrivyProvider.tsx
import React, { ReactNode } from 'react';
import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

const solanaConnectors = toSolanaWalletConnectors();
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

interface PrivyProviderProps {
  children: ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  // Only render the provider if we have a valid app ID
  if (!PRIVY_APP_ID) {
    console.error('Missing Privy App ID. Please set NEXT_PUBLIC_PRIVY_APP_ID environment variable.');
    // Return a fallback UI or error message
    return 
  }

  return (
    <PrivyAuthProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet', 'email', 'google', 'sms', 'twitter', 'discord', 'apple', 'farcaster', 'passkey', 'telegram', 'twitter', 'tiktok'],
        appearance: {
          theme: 'light',
          accentColor: '#6366f1',
          landingHeader: 'Welcome to Sonic Hub',
          loginMessage: 'Login to Sonic Hub', 
          showWalletLoginFirst: true, 
          walletChainType: 'solana-only',
        },
        externalWallets: {
          solana: {connectors: solanaConnectors}
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        solanaClusters: [{name: 'mainnet-beta', rpcUrl: 'https://api.mainnet-beta.solana.com'}],
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}