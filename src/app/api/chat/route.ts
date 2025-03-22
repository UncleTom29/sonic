// src/app/api/chat/route.ts
import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import { getFirestore } from 'firebase/firestore';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
export const runtime = 'edge';

// Enhanced schema with more actions and flexible parameters
const actionSchema = z.object({
  action: z.enum(['balance', 'transactions', 'network', 'help', 'none']),
  params: z.object({
    limit: z.number().optional().default(10),
    network: z.string().optional().default('solana'),
    detail: z.string().optional(),
    timeframe: z.string().optional(),
    type: z.string().optional(),
    sort: z.enum(['asc', 'desc']).optional().default('desc')
  }).optional().default({}),
  content: z.string().optional()  // Add content property
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
        ? google('gemini-1.5-pro') 
        : deepseek('deepseek-chat'),
      schema: actionSchema,
      system: `You are an AI assistant for a Solana & Sonic SVM blockchain wallet, $SONIC token, and SONIC SVM ecosystem application called SonicHub.
      
      Analyze user requests and determine the appropriate action:
      
      1. "balance" - When users want to check their wallet balance
      2. "transactions" - When users want to see transaction history
         - Use params.limit to specify number of transactions (default 10)
         - Use params.type to filter by transaction type
         - Use params.timeframe for time-based filtering
         - Use params.sort for sorting order (asc/desc)
      3. "network" - When users want network status information
      4. "help" - When users need assistance with the application
      5. "none" - When no blockchain action is needed (general conversation)
      
      Respond conversationally and naturally. If a user's request is ambiguous,
      choose the most likely action based on context, or use "none" and provide
      a helpful response explaining options.
      
      Examples:
      - "What's my balance?" → balance
      - "Show me my latest transactions" → transactions
      - "How many SOL do I have?" → balance
      - "What did I spend yesterday?" → transactions with timeframe=yesterday
      - "Is Solana running slow today?" → network
      - "How do I use this app?" → help
      - "Hello there!" → none
      
      For the "none" action, YOU MUST PROVIDE A COMPLETE CONVERSATIONAL RESPONSE in the content field.
      Do not leave the content field empty for any action - always include a helpful explanation.
      
      Consider conversation context when deciding actions. Be helpful and conversational.`,
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
       const accumulated = { content: "", action: null as "balance" | "transactions" | "network" | "help" | "none" | null, params: {} };
        
        for await (const partialObject of partialObjectStream) {
          // Update accumulated object with new data
          if (partialObject.action !== undefined) {
            accumulated.action = partialObject.action;
          }
          
          if (partialObject.params !== undefined) {
            accumulated.params = partialObject.params;
          }
          
          if (partialObject.content !== undefined) {
            accumulated.content = typeof partialObject.content === 'string' 
              ? partialObject.content 
              : JSON.stringify(partialObject.content);
          }
          
          // Create clean object with only the properties we need
          const cleanObject = {
            ...(partialObject.content !== undefined ? { content: partialObject.content } : {}),
            ...(partialObject.action !== undefined ? { action: partialObject.action } : {}),
            ...(partialObject.params !== undefined ? { params: partialObject.params } : {})
          };
          
          // Send proper JSON Lines format with newlines
          controller.enqueue(encoder.encode(JSON.stringify(cleanObject) + '\n'));
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