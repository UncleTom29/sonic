import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Firecrawl API configuration
const FIRECRAWL_API_KEY = process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

// List of key Sonic ecosystem URLs to crawl
const SONIC_URLS = [
  'https://sonic.game', // Main website
  'https://docs.sonic.game/architecture/sonic-whitepaper', // Whitepaper
  'https://docs.sonic.game/developers/getting-started/build-and-deploy-your-first-program', // Developer docs
  'https://github.com/mirrorworld-universe/sonic-code-examples', // Code examples
  'https://github.com/sendaifun/sonic-agent-kit', // Sonic Agent Kit
  'https://github.com/Saviour1001/SuperSonicWallet' // Wallet Adapter docs
];

interface KnowledgeEntry {
  url: string;
  content: string;
  lastUpdated: Date;
}

export function useKnowledge() {
  const [knowledgeBase, setKnowledgeBase] = useState<Record<string, KnowledgeEntry>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase if not already initialized
  const getFirebaseApp = () => {
    if (getApps().length === 0) {
      return initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    return getApps()[0];
  };

  // Fetch knowledge from Firecrawl
  const fetchKnowledgeFromFirecrawl = async (url: string) => {
    if (!FIRECRAWL_API_KEY) {
      throw new Error('Firecrawl API key is missing');
    }

    try {
      // Start LLMs.txt generation
      const startResponse = await fetch(`${FIRECRAWL_BASE_URL}/llmstxt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          maxUrls: 2,
          showFullText: true
        })
      });

      const startData = await startResponse.json();
      const jobId = startData.jobId;

      // Poll for job status
      let status = 'processing';
      let jobResult;
      while (status === 'processing') {
        const statusResponse = await fetch(`${FIRECRAWL_BASE_URL}/llmstxt/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
          }
        });
        const statusData = await statusResponse.json();
        status = statusData.status;
        
        if (status === 'completed') {
          jobResult = statusData.data;
          break;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return jobResult?.llmsfulltxt || '';
    } catch (err) {
      console.error('Firecrawl fetch error:', err);
      throw err;
    }
  };

  // Save knowledge to Firestore
  const saveKnowledgeToFirestore = async (url: string, content: string) => {
    try {
      const app = getFirebaseApp();
      const db = getFirestore(app);
      
      const knowledgeRef = doc(db, 'sonic_knowledge', encodeURIComponent(url));
      await setDoc(knowledgeRef, {
        url,
        content,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Firestore save error:', err);
      throw err;
    }
  };

  // Retrieve knowledge from Firestore
  const getKnowledgeFromFirestore = async (url: string) => {
    try {
      const app = getFirebaseApp();
      const db = getFirestore(app);
      
      const knowledgeRef = doc(db, 'sonic_knowledge', encodeURIComponent(url));
      const docSnap = await getDoc(knowledgeRef);
      
      return docSnap.exists() ? docSnap.data() as KnowledgeEntry : null;
    } catch (err) {
      console.error('Firestore retrieve error:', err);
      return null;
    }
  };

  // Main function to update knowledge base
  const updateKnowledgeBase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedKnowledge: Record<string, KnowledgeEntry> = {};

      for (const url of SONIC_URLS) {
        // First, check Firestore for existing knowledge
        const existingKnowledge = await getKnowledgeFromFirestore(url);
        
        // If knowledge exists and is recent (less than 30 days old), use it
        if (existingKnowledge && 
            existingKnowledge.lastUpdated && 
            (new Date().getTime() - existingKnowledge.lastUpdated.getTime()) < 30 * 24 * 60 * 60 * 1000) {
          updatedKnowledge[url] = existingKnowledge;
          continue;
        }

        // Fetch new knowledge from Firecrawl
        const content = await fetchKnowledgeFromFirecrawl(url);
        
        // Save to Firestore
        await saveKnowledgeToFirestore(url, content);
        
        updatedKnowledge[url] = {
          url,
          content,
          lastUpdated: new Date()
        };
      }

      setKnowledgeBase(updatedKnowledge);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Search through knowledge base
  const searchKnowledge = (query: string) => {
    const results: KnowledgeEntry[] = [];
    
    Object.values(knowledgeBase).forEach(entry => {
      if (entry.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(entry);
      }
    });
    
    return results;
  };

  // Automatic update on component mount
  useEffect(() => {
    updateKnowledgeBase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    knowledgeBase,
    updateKnowledgeBase,
    searchKnowledge,
    isLoading,
    error
  };
}