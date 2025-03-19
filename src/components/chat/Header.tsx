import { usePrivy } from '@privy-io/react-auth';
import { Logo } from '@/components/ui/Logo';

export const Header = () => {
  const { login, logout, authenticated, user } = usePrivy();
  
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-2">
        <Logo />
        <h1 className="text-xl font-semibold">Wallet Assistant</h1>
      </div>
      
      {authenticated ? (
        <div className="flex items-center gap-3">
          <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
            {user?.wallet?.address.slice(0, 6)}...{user?.wallet?.address.slice(-4)}
          </span>
          <button
            onClick={logout}
            className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 rounded-full"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </header>
  );
};