// src/components/layout/ChatLayout.tsx
import { useState, useEffect, useRef } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAI } from '@/app/providers/AIProvider';
import { usePrivy } from '@privy-io/react-auth';
import { useChatHistory } from '@/app/hooks/useChatHistory';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { ExtendedMessage } from '@/app/types/message';
import { useBlockchain } from '@/app/hooks/useBlockchain';

export function ChatLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [activeSection, setActiveSection] = useState<'chats' | 'account' | 'portfolio'>('chats');
  const { setMessages, clearMessages } = useAI();
  const { user, login, logout } = usePrivy();
  const { chats, deleteChat } = useChatHistory();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Portfolio state
  const { getBalance, getTransactions } = useBlockchain();
  const [balance, setBalance] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Check system preference and localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Use saved preference if available, otherwise use system preference
    const shouldUseDarkMode = savedMode ? savedMode === 'true' : prefersDark;
    
    setIsDarkMode(shouldUseDarkMode);
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const loadPortfolioData = async () => {
      if (activeSection === 'portfolio' && user?.wallet?.address) {
        setPortfolioLoading(true);
        setPortfolioError(null);
        
        try {
          // Get balance
          const balanceData = await getBalance();
          setBalance(typeof balanceData === 'number' ? balanceData : null);
          
          // Get transactions
          const txData = await getTransactions(5); // Limit to 5 recent transactions
          setTransactions(Array.isArray(txData) ? txData : []);
        } catch (err) {
          console.error('Portfolio data loading error:', err);
          setPortfolioError('Failed to load portfolio data');
        } finally {
          setPortfolioLoading(false);
        }
      }
    };
    
    loadPortfolioData();
    // Only reload when section changes or user changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user?.wallet?.address]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const startNewChat = () => {
    clearMessages();
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const loadChat = (chatMessages: ExtendedMessage[]) => {
    setMessages(chatMessages);
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent loading the chat when clicking delete
    deleteChat(chatId);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "New conversation";
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Format timestamp to readable date
 // Format timestamp to readable date
 const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return 'Unknown date';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format transaction type to be more readable
const formatTransactionType = (type: string) => {
  if (!type) return 'Transaction';
  
  // Convert snake_case or camelCase to Title Case with spaces
  return type
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase());
};
// Replace the refreshPortfolio function in ChatLayout.tsx with this:
const [isRefreshing, setIsRefreshing] = useState(false);

// Add this useRef at the top of your component
const lastRefreshTimeRef = useRef<number>(0);

const refreshPortfolio = async () => {
  if (!user?.wallet?.address) return;
  
  // Check if we're already refreshing
  if (isRefreshing) return;
  
  // Check if we've refreshed too recently (5 seconds cooldown)
  const now = Date.now();
  if (now - lastRefreshTimeRef.current < 5000) {
    setPortfolioError("Please wait a moment before refreshing again");
    return;
  }
  
  setIsRefreshing(true);
  setPortfolioLoading(true);
  setPortfolioError(null);
  lastRefreshTimeRef.current = now;
  
  try {
    const balanceData = await getBalance();
    setBalance(typeof balanceData === 'number' ? balanceData : null);
    
    const txData = await getTransactions(5);
    setTransactions(Array.isArray(txData) ? txData : []);
  } catch (err) {
    console.error('Portfolio refresh error:', err);
    setPortfolioError('Failed to refresh portfolio data. Wait for 10 seconds and try again');
  } finally {
    setPortfolioLoading(false);
    setIsRefreshing(false);
  }
};

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Overlay for mobile - close sidebar when clicking outside */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-indigo-600 text-white shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>

      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out z-30 flex flex-col bg-gray-900 dark:bg-gray-900 text-white shadow-xl`}
      >
        {/* Logo area */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Logo />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-600 text-transparent bg-clip-text">Sonic Hub</h1>
          </div>
          <DarkModeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        </div>

        {/* Navigation tabs */}
        <div className="flex border-b border-gray-800">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeSection === 'chats' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveSection('chats')}
          >
            Chats
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeSection === 'account' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveSection('account')}
          >
            Account
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeSection === 'portfolio' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveSection('portfolio')}
          >
            Portfolio
          </button>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'chats' && (
            <div className="p-4 space-y-2">
              <button
                onClick={startNewChat}
                className="w-full p-2 flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>New Chat</span>
              </button>
              
              <div className="mt-4 space-y-1">
                {chats?.map((chat) => (
                  <div key={chat.id} className="group relative">
                    <button
                      className="w-full p-2 flex items-center space-x-2 hover:bg-gray-800 rounded-lg transition-colors text-left"
                      onClick={() => loadChat(chat.messages as ExtendedMessage[])}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <span className="truncate text-sm flex-1">
                        {chat.messages && chat.messages.length > 0
                          ? truncateText(chat.messages[0].content, 20)
                          : "New conversation"}
                      </span>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                        aria-label="Delete chat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="p-4">
              {user ? (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-400">Wallet Address</div>
                    <div className="text-sm font-mono truncate">
                      {user.wallet?.address}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  Please connect your wallet to view account details
                </div>
              )}
            </div>
          )}

          {activeSection === 'portfolio' && (
            <div className="p-4 space-y-4">
              {user ? (
                <>
                  {/* Refresh Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={refreshPortfolio}
                      disabled={portfolioLoading}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={portfolioLoading ? "animate-spin" : ""}>
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      <span>{portfolioLoading ? "Refreshing..." : "Refresh"}</span>
                    </button>
                  </div>
                  
                  {/* SOL Balance Card */}
               {/* SOL Balance Card */}
<div className="p-3 bg-gray-800 rounded-lg">
  <div className="text-xs text-gray-400">SOL Balance</div>
  <div className="text-xl font-semibold flex items-center mt-1">
    {portfolioLoading ? (
      <div className="flex items-center">
        <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading...</span>
      </div>
    ) : portfolioError ? (
      <span className="text-red-400 text-sm">{portfolioError}</span>
    ) : balance !== null ? (
      <>
        <span className="mr-2">{typeof balance === 'number' ? balance.toFixed(3) : '0.000000'}</span>
        <span className="text-sm text-gray-400">SOL</span>
      </>
    ) : (
      <span className="text-sm text-gray-400">No balance data available</span>
    )}
  </div>
</div>
                  
                  {/* Recent Transactions Card */}
                  <div className="p-3 bg-gray-800 rounded-lg">
  <div className="text-xs text-gray-400 mb-2">Recent Transactions</div>
  {portfolioLoading ? (
    <div className="flex justify-center p-4">
      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  ) : portfolioError ? (
    <div className="text-red-400 text-sm p-2">{portfolioError}</div>
  ) : transactions.length > 0 ? (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {transactions.map((tx, index) => (
        <div key={index} className="text-xs p-2 bg-gray-700 rounded">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-300">
              {tx.signature ? (
                <a 
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-indigo-300 transition-colors"
                >
                  {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                </a>
              ) : (
                <span className="italic text-gray-400">No signature</span>
              )}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${tx.successful ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300'}`}>
              {tx.successful ? 'Success' : 'Failed'}
            </span>
          </div>
          
          {tx.type && (
            <div className="mt-1 text-indigo-300 text-xs">
              {formatTransactionType(tx.type)}
            </div>
          )}
          
          <div className="mt-1 text-gray-400">
            {formatDate(tx.blockTime)}
          </div>
          
          {typeof tx.fee === 'number' && (
            <div className="mt-1 text-gray-400">
              Fee: {(tx.fee / 1000000000).toFixed(6)} SOL
            </div>
          )}
          
          {tx.source && (
            <div className="mt-1 text-xs text-gray-500 italic">
              Source: {tx.source}
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="text-sm text-center text-gray-400 p-2">No transactions found</div>
  )}
</div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 mb-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p className="mb-4">Please connect your wallet to view portfolio</p>
                  <button
                    onClick={login}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User area */}
        <div className="p-4 border-t border-gray-800">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                  <span className="text-xs font-bold">{user.wallet?.address.slice(0, 2)}</span>
                </div>
                <div className="text-sm font-medium truncate max-w-[130px]">
                  {user.wallet?.address.slice(0, 6)}...{user.wallet?.address.slice(-4)}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={login}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {children}
      </div>
    </div>
  );
}