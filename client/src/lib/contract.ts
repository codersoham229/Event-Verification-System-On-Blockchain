import { ethers } from 'ethers';
import { web3Provider } from './web3';
import { Event, Ticket } from '@/types/web3';

// Event Ticketing Contract ABI (simplified, human-readable format)
const EVENT_TICKETING_ABI = [
  "function createEvent(string memory name, string memory description, uint256 eventDate, uint256 ticketPrice, uint256 maxTickets) external returns (uint256)",
  "function mintTicket(uint256 eventId, string memory attendeeName) external payable returns (uint256)",
  "function verifyTicket(uint256 eventId, uint256 ticketId) external view returns (bool valid, address owner, string memory attendeeName, bool isUsed)",
  "function markTicketUsed(uint256 eventId, uint256 ticketId) external",
  "function getEvent(uint256 eventId) external view returns (string memory name, string memory description, uint256 eventDate, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, address organizer)",
  "function getTicket(uint256 tokenId) external view returns (uint256 eventId, address ticketOwner, string memory attendeeName, bool isUsed)",
  "function deactivateEvent(uint256 eventId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tickets(uint256 tokenId) external view returns (uint256 eventId, address owner, string attendeeName, bool isUsed, uint256 mintedAt)",
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
    // Validate and checksum the address
    if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
      try {
        this.contractAddress = ethers.getAddress(contractAddress);
        console.log('Contract service initialized with address:', this.contractAddress);
      } catch (error) {
        console.error('Invalid contract address:', contractAddress, error);
        this.contractAddress = contractAddress;
      }
    } else {
      this.contractAddress = contractAddress;
    }
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

    // Ensure address is valid before creating contract
    const validAddress = ethers.getAddress(this.contractAddress);
    return new ethers.Contract(validAddress, EVENT_TICKETING_ABI, signer);
  }

  private async getReadOnlyContract(): Promise<ethers.Contract> {
    let provider = web3Provider.getProvider();
    
    // If provider not initialized, try to initialize it
    if (!provider && window.ethereum) {
      try {
        await web3Provider.initializeIfConnected();
        provider = web3Provider.getProvider();
      } catch (error) {
        console.warn('Could not initialize provider, using default RPC');
      }
    }
    
    // If still no provider, create one with public RPC
    if (!provider) {
      provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    }

    const validAddress = ethers.getAddress(this.contractAddress);
    return new ethers.Contract(validAddress, EVENT_TICKETING_ABI, provider);
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

      console.log('Creating event with params:', {
        name,
        description,
        eventDate: eventDateTimestamp,
        ticketPrice: ticketPriceWei.toString(),
        maxTickets
      });

      // Send transaction
      const tx = await contract.createEvent(
        name,
        description,
        eventDateTimestamp,
        ticketPriceWei,
        maxTickets
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      // The createEvent function returns the eventId directly
      // Wait for the transaction and parse the logs to get the ID
      let eventId = '1'; // Default fallback
      
      // Try to parse the event from logs
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({
              topics: [...log.topics],
              data: log.data
            });
            if (parsed && parsed.name === 'EventCreated') {
              eventId = parsed.args[0].toString();
              console.log('✅ Event created with ID from log:', eventId);
              break;
            }
          } catch (e) {
            // Not our event, continue
          }
        }
      }
      
      console.log('✅ Using event ID:', eventId);

      return {
        eventId: eventId,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error(error.reason || error.message || 'Failed to create event');
    }
  }

  async mintTicket(
    eventId: string,
    attendeeName: string,
    ticketPriceEth?: string
  ): Promise<{ ticketId: string; transactionHash: string }> {
    try {
      const contract = await this.getContract();
      
      // Get event details to determine ticket price
      let ticketPrice = ticketPriceEth || "0.001";
      
      if (!ticketPriceEth) {
        try {
          const eventDetails = await this.getEvent(eventId);
          ticketPrice = eventDetails.ticketPrice;
        } catch (error) {
          console.warn('Using default ticket price:', ticketPrice);
        }
      }
      
      console.log('Minting ticket - Event:', eventId, 'Price:', ticketPrice);
      
      const tx = await contract.mintTicket(eventId, attendeeName, {
        value: ethers.parseEther(ticketPrice)
      });

      const receipt = await tx.wait();
      
      // Parse the TicketMinted event to get the token ID
      let ticketId = '1'; // Default fallback
      
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({
              topics: [...log.topics],
              data: log.data
            });
            if (parsed && parsed.name === 'TicketMinted') {
              ticketId = parsed.args[1].toString(); // tokenId is the second argument
              console.log('✅ Ticket minted with ID from TicketMinted event:', ticketId);
              console.log('📋 Full TicketMinted event:', {
                eventId: parsed.args[0].toString(),
                tokenId: parsed.args[1].toString(),
                owner: parsed.args[2],
                attendeeName: parsed.args[3],
                contractAddress: this.contractAddress
              });
              break;
            }
          } catch (e) {
            // Not our event, continue
          }
        }
      }
      
      console.log('✅ Ticket minted successfully with ID:', ticketId);

      return {
        ticketId: ticketId,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error minting ticket:', error);
      throw new Error(error.reason || error.message || 'Failed to mint ticket');
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
      const contract = await this.getReadOnlyContract();
      const ticketIdNum = Number(ticketId);
      
      console.log('🔍 Verifying ticket on blockchain:', { 
        eventId, 
        ticketId: ticketIdNum,
        contractAddress: this.contractAddress 
      });
      
      // Simply check if the NFT exists by calling ownerOf
      // If it doesn't exist, it will throw an error
      try {
        const owner = await contract.ownerOf(ticketIdNum);
        console.log('✅ NFT exists! Owner:', owner);
        
        // NFT exists, so ticket is valid
        // Try to get additional details using getTicket function
        try {
          const ticketDetails = await contract.getTicket(ticketIdNum);
          console.log('✅ Got ticket details:', ticketDetails);
          
          return {
            valid: true,
            owner: ticketDetails[1], // ticketOwner
            attendeeName: ticketDetails[2],
            isUsed: ticketDetails[3]
          };
        } catch (detailError) {
          console.warn('⚠️ Could not get ticket details, but NFT exists');
          // NFT exists, just return basic info
          return {
            valid: true,
            owner: owner,
            attendeeName: 'Ticket Holder',
            isUsed: false
          };
        }
      } catch (ownerError: any) {
        console.error('❌ NFT does not exist:', ownerError.message);
        return {
          valid: false,
          owner: '',
          attendeeName: '',
          isUsed: false
        };
      }
    } catch (error: any) {
      console.error('❌ Verify ticket error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason
      });
      return {
        valid: false,
        owner: '',
        attendeeName: '',
        isUsed: false
      };
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
      const contract = await this.getReadOnlyContract();
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
      const contract = await this.getReadOnlyContract();
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
      const contract = await this.getReadOnlyContract();
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

  async isContractDeployed(): Promise<boolean> {
    try {
      const provider = web3Provider.getProvider();
      if (!provider) {
        return false;
      }
      
      const code = await provider.getCode(this.contractAddress);
      // If the code is '0x', the contract is not deployed
      return code !== '0x';
    } catch (error) {
      console.error('Error checking contract deployment:', error);
      return false;
    }
  }

  async verifyContractConnection(): Promise<{ deployed: boolean; eventCount?: number; error?: string }> {
    try {
      const deployed = await this.isContractDeployed();
      
      if (!deployed) {
        return {
          deployed: false,
          error: 'Contract not deployed at this address'
        };
      }

      try {
        const contract = await this.getReadOnlyContract();
        const count = await contract.eventCount();
        return {
          deployed: true,
          eventCount: Number(count)
        };
      } catch (error: any) {
        return {
          deployed: true,
          error: `Contract deployed but not responding: ${error.message}`
        };
      }
    } catch (error: any) {
      return {
        deployed: false,
        error: error.message
      };
    }
  }
}

export const contractService = new ContractService();
