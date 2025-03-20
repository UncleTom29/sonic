// app/page.tsx
'use client';

import { PrivyProvider } from '@/app/providers/PrivyProvider';
import { FirebaseProvider } from '@/app/providers/FirebaseProvider';
import { AIProvider } from '@/app/providers/AIProvider';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatLayout } from '@/components/layout/ChatLayout';
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
          <ChatLayout>
            <div className="flex flex-col h-full">
              <ChatMessages />
              <ChatInput />
            </div>
          </ChatLayout>
        </AIProvider>
      </FirebaseProvider>
    </PrivyProvider>
  );
}