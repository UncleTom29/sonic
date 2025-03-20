// src/app/hooks/useChatHistory.ts
import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { collection, doc, getDocs, setDoc, serverTimestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/client';
import { Message } from 'ai';

interface ChatHistory {
  id: string;
  messages: Message[];
  createdAt: Date | DocumentData;
}

export function useChatHistory() {
  const { user, authenticated } = usePrivy();
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChatHistory = useCallback(async () => {
    if (!authenticated || !user?.id) {
      setChats([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const querySnapshot = await getDocs(
        collection(db, 'users', user.id, 'chats')
      );
      const loadedChats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatHistory[];
      setChats(loadedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      setError('Failed to load chat history');
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authenticated]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  const saveChat = async (messages: Message[]) => {
    if (!authenticated || !user?.id || !messages || messages.length === 0) {
      return;
    }

    try {
      // Sanitize messages to avoid undefined values
      const sanitizedMessages = messages.map(msg => ({
        id: msg.id || Date.now().toString(),
        content: msg.content || '',
        role: msg.role || 'user'
      }));
      
      const chatRef = doc(collection(db, 'users', user.id, 'chats'));
      await setDoc(chatRef, {
        messages: sanitizedMessages,
        createdAt: serverTimestamp()
      });
      await loadChatHistory();
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  return { saveChat, chats, loadChatHistory, isLoading, error };
}