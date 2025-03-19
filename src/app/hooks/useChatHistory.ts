import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/client';
import { Message } from 'ai';

interface ChatHistory {
  id: string;
  messages: Message[];
  createdAt: Date;
}

export function useChatHistory() {
  const { user } = usePrivy();
  const [chats, setChats] = useState<ChatHistory[]>([]);

  const loadChatHistory = useCallback(async () => {
    if (!user?.id) return;

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
    }
  }, [user?.id]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  const saveChat = async (messages: Message[]) => {
    if (!user?.id) return;

    try {
      const chatRef = doc(collection(db, 'users', user.id, 'chats'));
      await setDoc(chatRef, {
        messages,
        createdAt: serverTimestamp()
      });
      await loadChatHistory();
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  return { saveChat, chats, loadChatHistory };
}