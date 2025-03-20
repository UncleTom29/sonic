// app/page.tsx
'use client';

import { PrivyProvider } from '@/app/providers/PrivyProvider';
import { FirebaseProvider } from '@/app/providers/FirebaseProvider';
import { AIProvider } from '@/app/providers/AIProvider';
import { Header } from '@/components/chat/Header';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration errors by only rendering client components after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <PrivyProvider>
      <FirebaseProvider>
        <AIProvider>
          <div className="flex flex-col h-screen">
            <Header />
            <ChatMessages />
            <div className="border-t p-4 bg-white dark:bg-gray-900">
              <div className="max-w-3xl mx-auto">
                <ChatInput />
              </div>
            </div>
          </div>
        </AIProvider>
      </FirebaseProvider>
    </PrivyProvider>
  );
}