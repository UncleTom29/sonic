// app/providers/PrivyProvider.tsx

import React, { ReactNode } from 'react';
import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
import {toSolanaWalletConnectors} from '@privy-io/react-auth/solana';
const solanaConnectors = toSolanaWalletConnectors();

interface PrivyProviderProps {
  children: ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <PrivyAuthProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['wallet', 'email', 'google', 'sms', 'twitter', 'discord', 'apple', 'farcaster', 'passkey', 'telegram', 'twitter', 'tiktok'],
        appearance: {
          theme: 'light',
          accentColor: '#6366f1',
          logo: 'https://your.logo.url',
          landingHeader: 'Your custom header text',
          loginMessage: 'Your custom header text', 
          showWalletLoginFirst: true, 
          walletChainType: 'solana-only',
        },
        externalWallets: {
            solana: {connectors: solanaConnectors}
          },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        solanaClusters: [{name: 'mainnet-beta', rpcUrl: 'https://api.mainnet-alpha.sonic.game '}],
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}