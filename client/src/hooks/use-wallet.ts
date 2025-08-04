import { useState, useEffect, useCallback } from 'react';
import { web3Provider } from '@/lib/web3';
import { WalletState, REQUIRED_CHAIN_ID } from '@/types/web3';
import { useToast } from '@/hooks/use-toast';

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    isCorrectChain: false
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const updateWalletState = useCallback(async () => {
    try {
      if (!web3Provider.isConnected()) {
        setWalletState({
          isConnected: false,
          address: null,
          balance: null,
          chainId: null,
          isCorrectChain: false
        });
        return;
      }

      const address = await web3Provider.getAccount();
      const network = await web3Provider.getNetwork();
      const balance = address ? await web3Provider.getBalance(address) : null;

      setWalletState({
        isConnected: true,
        address,
        balance,
        chainId: network.chainId,
        isCorrectChain: network.chainId === REQUIRED_CHAIN_ID
      });
    } catch (error: any) {
      console.error('Failed to update wallet state:', error);
      setWalletState({
        isConnected: false,
        address: null,
        balance: null,
        chainId: null,
        isCorrectChain: false
      });
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      const result = await web3Provider.connectWallet();
      
      if (result.chainId !== REQUIRED_CHAIN_ID) {
        toast({
          title: "Wrong Network",
          description: "Please switch to Sepolia testnet to continue.",
          variant: "destructive"
        });
        
        try {
          await web3Provider.switchToSepolia();
          await updateWalletState();
          toast({
            title: "Network Switched",
            description: "Successfully connected to Sepolia testnet."
          });
        } catch (switchError: any) {
          throw new Error(`Failed to switch to Sepolia: ${switchError.message}`);
        }
      } else {
        await updateWalletState();
        toast({
          title: "Wallet Connected",
          description: `Connected to ${result.address.slice(0, 6)}...${result.address.slice(-4)}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, updateWalletState, toast]);

  const switchToSepolia = useCallback(async () => {
    try {
      await web3Provider.switchToSepolia();
      await updateWalletState();
      toast({
        title: "Network Switched",
        description: "Successfully switched to Sepolia testnet."
      });
    } catch (error: any) {
      toast({
        title: "Switch Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [updateWalletState, toast]);

  const disconnect = useCallback(() => {
    web3Provider.disconnect();
    setWalletState({
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
      isCorrectChain: false
    });
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected."
    });
  }, [toast]);

  // Set up event listeners for account and chain changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        updateWalletState();
      }
    };

    const handleChainChanged = () => {
      updateWalletState();
    };

    web3Provider.setupEventListeners(handleAccountsChanged, handleChainChanged);

    // Check if already connected on mount
    updateWalletState();

    return () => {
      web3Provider.removeEventListeners();
    };
  }, [updateWalletState, disconnect]);

  return {
    walletState,
    isConnecting,
    connectWallet,
    switchToSepolia,
    disconnect,
    refreshWallet: updateWalletState
  };
}
