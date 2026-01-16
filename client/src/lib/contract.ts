import { ethers } from 'ethers';
import { web3Provider } from './web3';
import { Event, Ticket } from '@/types/web3';
import FULL_ABI from './full-abi.json';

// Event Ticketing Contract ABI (full ABI from deployed contract)
const EVENT_TICKETING_ABI = FULL_ABI;

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

  private getReadOnlyContract(): ethers.Contract {
    const provider = web3Provider.getProvider();
    if (!provider) {
      throw new Error('Web3 provider not initialized');
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
        maxTickets,
        contractAddress: this.contractAddress
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
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Transaction confirmed!');
      console.log('Transaction hash:', receipt.hash);
      console.log('Block number:', receipt.blockNumber);
      console.log('Contract address:', this.contractAddress);
      console.log('Receipt status:', receipt.status);
      console.log('Total logs:', receipt.logs.length);
      
      // Log full receipt for debugging
      console.log('Full receipt:', JSON.stringify(receipt, null, 2));
      
      // Try multiple methods to get the event ID
      let eventId: string | null = null;

      // If no logs at all, use fallback method: query the eventCount
      if (receipt.logs.length === 0) {
        console.warn('⚠️ No logs in transaction receipt! Using fallback method...');
        console.log('Transaction hash:', receipt.hash);
        
        try {
          // Call eventCount() to get the total number of events
          // The event we just created should be the latest one
          const eventCount = await contract.eventCount();
          // Most contracts use 1-based indexing, so the latest event ID equals the count
          // But some use 0-based, so the latest would be count - 1
          // We'll use the count as-is since most Solidity contracts start event IDs at 1
          eventId = eventCount.toString();
          console.log('✅ Retrieved eventId from eventCount():', eventId);
          console.log('Total events in contract:', eventCount.toString());
          
          // Verify the event exists by trying to fetch it
          try {
            const eventData = await contract.getEvent(eventId);
            console.log('✅ Verified event exists:', eventData);
          } catch (verifyError) {
            // If event doesn't exist at count, try count-1 (0-based indexing)
            console.log('Event not found at count, trying count-1...');
            const altEventId = (BigInt(eventCount) - BigInt(1)).toString();
            const altEventData = await contract.getEvent(altEventId);
            console.log('✅ Found event at count-1:', altEventData);
            eventId = altEventId;
          }
        } catch (error) {
          console.error('Failed to get eventCount:', error);
          throw new Error('Transaction succeeded but no events were emitted. The contract may not be deployed correctly.');
        }
      }

      // Only try to parse logs if we don't already have the eventId from eventCount
      if (!eventId && receipt.logs.length > 0) {
        // Method 1: Extract directly from topics (most reliable for indexed parameters)
        console.log('\n=== Method 1: Direct topic extraction ===');
        
        // Calculate EventCreated signature first
        const eventCreatedSig = ethers.id('EventCreated(uint256,string,address)');
        console.log('Looking for EventCreated signature:', eventCreatedSig);
        
        for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`\n--- Log ${i} ---`);
        console.log('Address:', log.address);
        console.log('Topics:', log.topics);
        console.log('Data:', log.data);
        console.log('Topic[0] (signature):', log.topics[0]);
        
        // First check if this log is from our contract and has the EventCreated signature
        let isFromContract = false;
        try {
          // Checksum both addresses for proper comparison
          const logAddress = ethers.getAddress(log.address);
          const contractAddress = ethers.getAddress(this.contractAddress);
          isFromContract = logAddress === contractAddress;
          console.log('Checksummed addresses match:', isFromContract);
        } catch (e) {
          // Fallback to lowercase comparison
          isFromContract = log.address.toLowerCase() === this.contractAddress.toLowerCase();
          console.log('Lowercase addresses match:', isFromContract);
        }
        
        const hasEventCreatedSig = log.topics[0] === eventCreatedSig;
        console.log('Has EventCreated signature:', hasEventCreatedSig);
        console.log('Expected signature:', eventCreatedSig);
        console.log('Actual signature:', log.topics[0]);
        
        // Try to extract eventId regardless of contract check (for debugging)
        if (log.topics.length > 1) {
          try {
            const potentialEventId = BigInt(log.topics[1]).toString();
            console.log('Potential eventId from topics[1]:', potentialEventId);
            
            // If this is from our contract with the right signature, use it
            if (isFromContract && hasEventCreatedSig) {
              eventId = potentialEventId;
              console.log('✅ EXTRACTED eventId:', eventId);
              break;
            }
          } catch (e) {
            console.error('Could not decode topics[1] as eventId:', e);
          }
        }
        
        // Also try parsing with interface as backup
        try {
          const parsedLog = contract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          
          if (parsedLog) {
            console.log('Successfully parsed log as:', parsedLog.name);
            console.log('Parsed args:', parsedLog.args);
            
            if (parsedLog.name === 'EventCreated') {
              if (parsedLog.args && parsedLog.args.length > 0) {
                eventId = parsedLog.args[0].toString();
                console.log('✅ EXTRACTED eventId from parsed args:', eventId);
                break;
              }
            }
          }
        } catch (e: any) {
          console.log('Could not parse with interface:', e.message);
        }
      }
      } // Close the if (!eventId && receipt.logs.length > 0) block

      // If we found the event ID, return it immediately
      if (eventId) {
        console.log('✅ Event created successfully with ID:', eventId);
        return {
          eventId: eventId,
          transactionHash: receipt.hash
        };
      }

      // Method 2: Try querying recent events as fallback
      if (!eventId) {
        console.log('⚠️ Could not extract from logs, trying to query recent events...');
        
        try {
          const filter = contract.filters.EventCreated();
          const latestBlock = await contract.runner?.provider?.getBlockNumber();
          const fromBlock = Math.max(0, (latestBlock || receipt.blockNumber) - 10);
          
          console.log(`Querying events from block ${fromBlock} to ${receipt.blockNumber}`);
          const events = await contract.queryFilter(filter, fromBlock, receipt.blockNumber);
          
          console.log(`Found ${events.length} EventCreated events in range`);
          
          if (events.length > 0) {
            // Get the last event (most recent)
            const lastEvent = events[events.length - 1];
            console.log('Last event:', lastEvent);
            
            if ('args' in lastEvent && lastEvent.args.length > 0) {
              eventId = lastEvent.args[0].toString();
              console.log('✅ Found event ID from recent events query:', eventId);
            }
          }
        } catch (e: any) {
          console.error('Could not query recent events:', e.message);
        }
      }

      // Final fallback: if we still don't have an event ID, the transaction succeeded but we can't get the ID
      if (!eventId) {
        console.error('❌ Could not extract event ID from transaction');
        console.error('Transaction succeeded but event ID extraction failed');
        console.error('Transaction hash:', receipt.hash);
        console.error('Please check the transaction on Etherscan');
        throw new Error(
          `Event was created successfully but could not determine event ID. ` +
          `Transaction hash: ${receipt.hash}. ` +
          `Please check the transaction on a block explorer.`
        );
      }

      console.log('✅ Returning eventId:', eventId);
      return {
        eventId: eventId,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      
      // Provide more helpful error messages
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds to complete transaction');
      } else if (error.message?.includes('execution reverted')) {
        throw new Error('Contract execution reverted. The contract may not be deployed or may have restrictions.');
      }
      
      throw new Error(`Failed to create event: ${error.message || 'Unknown error'}`);
    }
  }

  async mintTicket(
    eventId: string,
    attendeeName: string,
    ticketPriceEth?: string
  ): Promise<{ ticketId: string; transactionHash: string }> {
    try {
      const contract = await this.getContract();
      
      console.log('Minting ticket for event:', eventId, 'attendee:', attendeeName);
      
      // If ticket price is provided, use it; otherwise try to get event details
      let ticketPrice = "0.001"; // Default fallback price
      
      if (ticketPriceEth) {
        ticketPrice = ticketPriceEth;
        console.log('Using provided ticket price:', ticketPrice);
      } else {
        // Try to get event details, but don't fail if we can't
        try {
          console.log('Fetching event details for eventId:', eventId);
          const eventDetails = await this.getEvent(eventId);
          ticketPrice = eventDetails.ticketPrice;
          console.log('Got ticket price from event:', ticketPrice);
        } catch (error: any) {
          console.warn('Could not fetch event details:', error.message);
          console.warn('Using default ticket price:', ticketPrice);
          
          // If the event ID looks invalid (starts with 'event_'), show a better error
          if (eventId.startsWith('event_')) {
            throw new Error(
              'Invalid event ID. The event was not created properly. ' +
              'Please try creating the event again.'
            );
          }
          // Otherwise continue with default price
        }
      }
      
      console.log('Sending mintTicket transaction...');
      const tx = await contract.mintTicket(eventId, attendeeName, {
        value: ethers.parseEther(ticketPrice)
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
        const contract = this.getReadOnlyContract();
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
