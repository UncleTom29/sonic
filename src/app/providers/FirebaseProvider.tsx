// app/providers/FirebaseProvider.tsx
'use client';

import { initializeApp, getApps } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
import { ReactNode, useEffect } from 'react';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measuremnetId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function FirebaseProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }
  }, []);

  return <>{children}</>;
}