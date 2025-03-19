// app/page.tsx
'use client';

import { PrivyProvider } from '@/app/providers/PrivyProvider';
import { FirebaseProvider } from '@/app/providers/FirebaseProvider';
import { Header } from '@/components/chat/Header';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';

export default function Home() {
  return (
    <PrivyProvider>
      <FirebaseProvider>
        {/* <AIProvider> */}
          <div className="flex flex-col h-screen">
            <Header />
            <ChatMessages />
            <div className="border-t p-4 bg-white">
              <div className="max-w-3xl mx-auto">
                <ChatInput />
              </div>
            </div>
          </div>
        {/* </AIProvider> */}
      </FirebaseProvider>
    </PrivyProvider>
  );
}