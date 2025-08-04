import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/use-wallet';
import { Wallet, X, AlertTriangle } from 'lucide-react';

export function WalletConnect() {
  const { walletState, isConnecting, connectWallet, switchToSepolia, disconnect } = useWallet();

  if (walletState.isConnected) {
    return (
      <div className="flex items-center space-x-3">
        {!walletState.isCorrectChain && (
          <Button
            onClick={switchToSepolia}
            size="sm"
            variant="outline"
            className="border-warning text-warning hover:bg-warning hover:text-white"
            data-testid="button-switch-network"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Switch to Sepolia
          </Button>
        )}
        
        <div className="flex items-center space-x-2 bg-secondary/10 text-secondary px-4 py-2 rounded-lg">
          <Wallet className="w-4 h-4" />
          <span className="font-medium text-sm" data-testid="text-wallet-address">
            {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
          </span>
          {walletState.balance && (
            <Badge variant="secondary" className="text-xs" data-testid="text-wallet-balance">
              {parseFloat(walletState.balance).toFixed(4)} ETH
            </Badge>
          )}
          <Button
            onClick={disconnect}
            size="sm"
            variant="ghost"
            className="p-1 h-auto text-slate-500 hover:text-slate-700"
            data-testid="button-disconnect-wallet"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <Badge variant="outline" className="text-xs" data-testid="status-network">
          Sepolia Testnet
        </Badge>
      </div>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
      data-testid="button-connect-wallet"
    >
      <Wallet className="w-4 h-4 mr-2" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
