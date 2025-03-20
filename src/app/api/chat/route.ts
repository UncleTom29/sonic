// src/app/api/chat/route.ts
import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import { getFirestore } from 'firebase/firestore';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

const actionSchema = z.object({
  action: z.enum(['balance', 'transactions', 'network']),
  params: z.object({
    limit: z.number().optional().default(10),
    network: z.string().optional().default('solana')
  })
});

// Initialize Firebase directly in the API route
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Get or initialize Firebase app
const getFirebaseApp = () => {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  } else {
    return getApps()[0];
  }
};

export async function POST(req: Request) {
  const { messages, userId, model } = await req.json();
  
  if (!userId) {
    return Response.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  try {
    const { partialObjectStream } = await streamObject({
      model: model === 'google' 
        ? google('models/gemini-2.0-flash-exp') 
        : deepseek('deepseek-chat'),
      schema: actionSchema,
      system: `Analyze user requests and output JSON with:
      1. action (balance/transactions/networkStatus)
      2. params based on query
      Use default values where necessary`,
      messages
    });

    // Initialize Firebase and save to Firestore
    try {
      const app = getFirebaseApp();
      const db = getFirestore(app);
      
      // Check if the latest message is from the user to avoid duplicates
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.role === 'user') {
        const chatRef = doc(collection(db, 'users', userId, 'chats'));
        await setDoc(chatRef, {
          messages,
          createdAt: serverTimestamp()
        });
      }
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      // Continue with the response even if Firestore fails
    }

    // Create a proper JSON Lines stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        for await (const partialObject of partialObjectStream) {
          // Send proper JSON Lines format with newlines
          controller.enqueue(encoder.encode(JSON.stringify(partialObject) + '\n'));
        }
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' }
    });

  } catch (error) {
    console.error('AI processing error:', error);
    return Response.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}