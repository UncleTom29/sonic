import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import { db } from '@/app/lib/firebase/client';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const actionSchema = z.object({
  action: z.enum(['balance', 'transactions', 'network']),
  params: z.object({
    limit: z.number().optional().default(10),
    network: z.string().optional().default('solana')
  })
});

export async function POST(req: Request) {
  const { messages, userId, model } = await req.json();
  
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

    // Save initial message to Firestore
    const chatRef = doc(collection(db, 'users', userId, 'chats'));
    await setDoc(chatRef, {
      messages,
      createdAt: serverTimestamp()
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const partialObject of partialObjectStream) {
          controller.enqueue(encoder.encode(JSON.stringify(partialObject)));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI processing error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}