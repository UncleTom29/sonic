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
      // Deep sanitize messages to ensure they're Firestore-compatible
      const sanitizedMessages = messages.map(msg => {
        // Start with basic fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sanitized: any = {
          id: msg.id || Date.now().toString(),
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          role: msg.role || 'user',
        };
        
        // Only add action if it exists and is a simple type
        if (msg.action && typeof msg.action === 'string') {
          sanitized.action = msg.action;
        }
        
        // Convert any other fields that might be present to strings if they're objects
        Object.keys(msg).forEach(key => {
          if (!['id', 'content', 'role', 'action'].includes(key)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = (msg as any)[key];
            if (value !== undefined && value !== null) {
              // Convert objects to strings, but keep primitive types as is
              sanitized[key] = typeof value === 'object' ? JSON.stringify(value) : value;
            }
          }
        });
        
        return sanitized;
      });
      
      const chatRef = doc(collection(db, 'users', user.id, 'chats'));
      await setDoc(chatRef, {
        messages: sanitizedMessages,
        createdAt: serverTimestamp()
      });
      
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