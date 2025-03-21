// src/app/hooks/useChatHistory.ts
import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp, DocumentData, orderBy, query } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/client';
import { ExtendedMessage } from '@/app/types/message';

interface ChatHistory {
  id: string;
  messages: ExtendedMessage[];
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
      const chatsRef = collection(db, 'users', user.id, 'chats');
      const chatsQuery = query(chatsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(chatsQuery);
      
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

  const saveChat = async (messages: ExtendedMessage[]) => {
    if (!authenticated || !user?.id || !messages || messages.length === 0) {
      return;
    }

    try {
      // Sanitize messages to ensure no undefined values
      const sanitizedMessages = messages.map(msg => ({
        id: msg.id || Date.now().toString(),
        content: msg.content || '',
        role: msg.role || 'user',
        // Only include action if it exists
        ...(msg.action ? { action: msg.action } : {})
      }));
      
      const chatRef = doc(collection(db, 'users', user.id, 'chats'));
      await setDoc(chatRef, {
        messages: sanitizedMessages,
        createdAt: serverTimestamp()
      });
      
      // Don't call loadChatHistory here to prevent duplicates
      // Let the component that needs fresh data call it
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!authenticated || !user?.id) {
      return;
    }
    
    try {
      const chatRef = doc(db, 'users', user.id, 'chats', chatId);
      await deleteDoc(chatRef);
      
      // Update local state to reflect the deletion
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat');
    }
  };

  return { saveChat, deleteChat, chats, loadChatHistory, isLoading, error };
}