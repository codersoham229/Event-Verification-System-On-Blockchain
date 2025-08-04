import { ethers } from 'ethers';
import { web3Provider } from './web3';
import { Event, Ticket } from '@/types/web3';

// Event Ticketing Contract ABI (simplified for essential functions)
const EVENT_TICKETING_ABI = [
  "function createEvent(string memory name, string memory description, uint256 eventDate, uint256 ticketPrice, uint256 maxTickets) external returns (uint256)",
  "function mintTicket(uint256 eventId, string memory attendeeName) external payable returns (uint256)",
  "function verifyTicket(uint256 eventId, uint256 ticketId) external view returns (bool valid, address owner, string memory attendeeName, bool isUsed)",
  "function markTicketUsed(uint256 eventId, uint256 ticketId) external",
  "function getEvent(uint256 eventId) external view returns (string memory name, string memory description, uint256 eventDate, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, address organizer)",
  "function getTicket(uint256 tokenId) external view returns (uint256 eventId, address owner, string memory attendeeName, bool isUsed)",
  "function eventCount() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "event EventCreated(uint256 indexed eventId, string name, address indexed organizer)",
  "event TicketMinted(uint256 indexed eventId, uint256 indexed tokenId, address indexed owner, string attendeeName)",
  "event TicketVerified(uint256 indexed eventId, uint256 indexed tokenId, address indexed verifier)",
  "event TicketUsed(uint256 indexed eventId, uint256 indexed tokenId)"
];

// Default contract address - should be set via environment variable
const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export class ContractService {
  private contractAddress: string;
  
  constructor(contractAddress: string = DEFAULT_CONTRACT_ADDRESS) {
    this.contractAddress = contractAddress;
  }

  private async getContract(): Promise<ethers.Contract> {
    // Ensure signer is available
    const account = await web3Provider.getAccount();
    if (!account) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    
    const signer = web3Provider.getSigner();
    if (!signer) {
      throw new Error('Wallet signer not available. Please reconnect your wallet.');
    }
    
    if (this.contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error('Contract address not configured. Please set VITE_CONTRACT_ADDRESS environment variable.');
    }

    return new ethers.Contract(this.contractAddress, EVENT_TICKETING_ABI, signer);
  }

  private getReadOnlyContract(): ethers.Contract {
    const provider = web3Provider.getProvider();
    if (!provider) {
      throw new Error('Web3 provider not initialized');
    }

    return new ethers.Contract(this.contractAddress, EVENT_TICKETING_ABI, provider);
  }

  async createEvent(
    name: string,
    description: string,
    eventDate: Date,
    ticketPriceEth: string,
    maxTickets: number
  ): Promise<{ eventId: string; transactionHash: string }> {
    try {
      const contract = await this.getContract();
      const ticketPriceWei = ethers.parseEther(ticketPriceEth);
      const eventDateTimestamp = Math.floor(eventDate.getTime() / 1000);

      const tx = await contract.createEvent(
        name,
        description,
        eventDateTimestamp,
        ticketPriceWei,
        maxTickets
      );

      const receipt = await tx.wait();
      
      // Parse the EventCreated event to get the event ID
      const eventCreatedLog = receipt.logs.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'EventCreated';
        } catch {
          return false;
        }
      });

      if (!eventCreatedLog) {
        throw new Error('Event creation failed - no EventCreated event found');
      }

      const parsedLog = contract.interface.parseLog(eventCreatedLog);
      const eventId = parsedLog?.args[0].toString();

      return {
        eventId,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  async mintTicket(
    eventId: string,
    attendeeName: string
  ): Promise<{ ticketId: string; transactionHash: string }> {
    try {
      const contract = await this.getContract();
      
      // Get event details to determine ticket price
      const eventDetails = await this.getEvent(eventId);
      
      const tx = await contract.mintTicket(eventId, attendeeName, {
        value: ethers.parseEther(eventDetails.ticketPrice)
      });

      const receipt = await tx.wait();
      
      // Parse the TicketMinted event to get the ticket ID
      const ticketMintedLog = receipt.logs.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'TicketMinted';
        } catch {
          return false;
        }
      });

      if (!ticketMintedLog) {
        throw new Error('Ticket minting failed - no TicketMinted event found');
      }

      const parsedLog = contract.interface.parseLog(ticketMintedLog);
      const ticketId = parsedLog?.args[1].toString();

      return {
        ticketId,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      throw new Error(`Failed to mint ticket: ${error.message}`);
    }
  }

  async verifyTicket(
    eventId: string,
    ticketId: string
  ): Promise<{
    valid: boolean;
    owner: string;
    attendeeName: string;
    isUsed: boolean;
  }> {
    try {
      const contract = this.getReadOnlyContract();
      const result = await contract.verifyTicket(eventId, ticketId);
      
      return {
        valid: result[0],
        owner: result[1],
        attendeeName: result[2],
        isUsed: result[3]
      };
    } catch (error: any) {
      throw new Error(`Failed to verify ticket: ${error.message}`);
    }
  }

  async markTicketUsed(
    eventId: string,
    ticketId: string
  ): Promise<{ transactionHash: string }> {
    try {
      const contract = await this.getContract();
      const tx = await contract.markTicketUsed(eventId, ticketId);
      await tx.wait();
      
      return {
        transactionHash: tx.hash
      };
    } catch (error: any) {
      throw new Error(`Failed to mark ticket as used: ${error.message}`);
    }
  }

  async getEvent(eventId: string): Promise<Event> {
    try {
      const contract = this.getReadOnlyContract();
      const result = await contract.getEvent(eventId);
      
      const [name, description, eventDate, ticketPrice, maxTickets, ticketsSold, organizer] = result as unknown as [string, string, bigint, bigint, bigint, bigint, string];
      
      return {
        id: eventId,
        name,
        description,
        date: new Date(Number(eventDate) * 1000).toISOString(),
        ticketPrice: ethers.formatEther(ticketPrice),
        maxTickets: Number(maxTickets),
        ticketsSold: Number(ticketsSold),
        organizer
      };
    } catch (error: any) {
      // More specific error handling for event lookup failures
      if (error.message.includes('Event does not exist')) {
        throw new Error(`Event with ID ${eventId} does not exist on the smart contract. The event may not have been created successfully.`);
      }
      throw new Error(`Failed to get event: ${error.message}`);
    }
  }

  async getTicket(tokenId: string): Promise<Ticket> {
    try {
      const contract = this.getReadOnlyContract();
      const result = await contract.getTicket(tokenId);
      
      return {
        id: tokenId,
        eventId: result[0].toString(),
        tokenId: tokenId,
        owner: result[1],
        attendeeName: result[2],
        isUsed: result[3],
        mintedAt: new Date().toISOString() // Contract doesn't store mint time
      };
    } catch (error: any) {
      throw new Error(`Failed to get ticket: ${error.message}`);
    }
  }

  async getEventCount(): Promise<number> {
    try {
      const contract = this.getReadOnlyContract();
      const count = await contract.eventCount();
      return Number(count);
    } catch (error: any) {
      throw new Error(`Failed to get event count: ${error.message}`);
    }
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  setContractAddress(address: string): void {
    this.contractAddress = address;
  }
}

export const contractService = new ContractService();
