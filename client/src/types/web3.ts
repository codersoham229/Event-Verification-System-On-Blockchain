export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  ticketPrice: string;
  maxTickets: number;
  ticketsSold: number;
  organizer: string;
  contractAddress?: string;
  blockNumber?: number;
  transactionHash?: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  tokenId: string;
  owner: string;
  attendeeName: string;
  isUsed: boolean;
  mintedAt: string;
  transactionHash?: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
  receipt?: any;
}

export interface ContractAddresses {
  eventTicketing: string;
}

export const SEPOLIA_CHAIN_ID = 11155111;
export const REQUIRED_CHAIN_ID = SEPOLIA_CHAIN_ID;
