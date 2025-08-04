import { ethers } from 'ethers';
import { REQUIRED_CHAIN_ID } from '@/types/web3';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class Web3Provider {
  private static instance: Web3Provider;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  private constructor() {}

  static getInstance(): Web3Provider {
    if (!Web3Provider.instance) {
      Web3Provider.instance = new Web3Provider();
    }
    return Web3Provider.instance;
  }

  async connectWallet(): Promise<{
    address: string;
    chainId: number;
    balance: string;
  }> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(address);
      
      return {
        address,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance)
      };
    } catch (error: any) {
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  async switchToSepolia(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}`,
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'SEP',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  async getAccount(): Promise<string | null> {
    if (!this.signer && this.provider) {
      await this.reinitializeSigner();
    }
    if (!this.signer) return null;
    try {
      return await this.signer.getAddress();
    } catch {
      return null;
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) throw new Error('Provider not initialized');
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getNetwork(): Promise<{ chainId: number; name: string }> {
    if (!this.provider) throw new Error('Provider not initialized');
    const network = await this.provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name
    };
  }

  isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
  }

  // Listen for account and chain changes
  setupEventListeners(
    onAccountsChanged: (accounts: string[]) => void,
    onChainChanged: (chainId: string) => void
  ): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', (chainId: string) => {
      // Reinitialize provider on chain change
      if (this.provider) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = null; // Will be reinitialized when needed
      }
      onChainChanged(chainId);
    });
  }

  // Reinitialize signer after network change
  async reinitializeSigner(): Promise<void> {
    if (this.provider && !this.signer) {
      try {
        this.signer = await this.provider.getSigner();
      } catch (error) {
        console.warn('Failed to reinitialize signer:', error);
      }
    }
  }

  removeEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }
}

export const web3Provider = Web3Provider.getInstance();
