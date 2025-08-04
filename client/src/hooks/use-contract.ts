import { useState, useCallback } from 'react';
import { contractService } from '@/lib/contract';
import { Event, Ticket, TransactionStatus } from '@/types/web3';
import { useToast } from '@/hooks/use-toast';

export function useContract() {
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    status: 'idle'
  });
  const { toast } = useToast();

  const resetTransactionStatus = useCallback(() => {
    setTransactionStatus({ status: 'idle' });
  }, []);

  const createEvent = useCallback(async (
    name: string,
    description: string,
    eventDate: Date,
    ticketPriceEth: string,
    maxTickets: number
  ): Promise<{ eventId: string; transactionHash: string } | null> => {
    setTransactionStatus({ status: 'pending' });
    
    try {
      const result = await contractService.createEvent(
        name,
        description,
        eventDate,
        ticketPriceEth,
        maxTickets
      );
      
      setTransactionStatus({
        status: 'success',
        hash: result.transactionHash
      });

      toast({
        title: "Event Created!",
        description: `Event created successfully with ID: ${result.eventId}`
      });

      return result;
    } catch (error: any) {
      setTransactionStatus({
        status: 'error',
        error: error.message
      });

      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });

      return null;
    }
  }, [toast]);

  const mintTicket = useCallback(async (
    eventId: string,
    attendeeName: string
  ): Promise<{ ticketId: string; transactionHash: string } | null> => {
    setTransactionStatus({ status: 'pending' });
    
    try {
      const result = await contractService.mintTicket(eventId, attendeeName);
      
      setTransactionStatus({
        status: 'success',
        hash: result.transactionHash
      });

      toast({
        title: "Ticket Minted!",
        description: `Ticket minted successfully with ID: ${result.ticketId}`
      });

      return result;
    } catch (error: any) {
      setTransactionStatus({
        status: 'error',
        error: error.message
      });

      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive"
      });

      return null;
    }
  }, [toast]);

  const verifyTicket = useCallback(async (
    eventId: string,
    ticketId: string
  ): Promise<{
    valid: boolean;
    owner: string;
    attendeeName: string;
    isUsed: boolean;
  } | null> => {
    setTransactionStatus({ status: 'pending' });
    
    try {
      const result = await contractService.verifyTicket(eventId, ticketId);
      
      setTransactionStatus({ status: 'success' });

      if (result.valid) {
        toast({
          title: "Ticket Valid ✅",
          description: `Ticket verified for ${result.attendeeName}`
        });
      } else {
        toast({
          title: "Invalid Ticket ❌",
          description: "This ticket could not be verified on the blockchain",
          variant: "destructive"
        });
      }

      return result;
    } catch (error: any) {
      setTransactionStatus({
        status: 'error',
        error: error.message
      });

      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive"
      });

      return null;
    }
  }, [toast]);

  const markTicketUsed = useCallback(async (
    eventId: string,
    ticketId: string
  ): Promise<boolean> => {
    setTransactionStatus({ status: 'pending' });
    
    try {
      await contractService.markTicketUsed(eventId, ticketId);
      
      setTransactionStatus({ status: 'success' });

      toast({
        title: "Ticket Marked as Used",
        description: "Ticket has been successfully marked as used"
      });

      return true;
    } catch (error: any) {
      setTransactionStatus({
        status: 'error',
        error: error.message
      });

      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });

      return false;
    }
  }, [toast]);

  const getEvent = useCallback(async (eventId: string): Promise<Event | null> => {
    try {
      return await contractService.getEvent(eventId);
    } catch (error: any) {
      toast({
        title: "Failed to Load Event",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  const getTicket = useCallback(async (tokenId: string): Promise<Ticket | null> => {
    try {
      return await contractService.getTicket(tokenId);
    } catch (error: any) {
      toast({
        title: "Failed to Load Ticket",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  return {
    transactionStatus,
    resetTransactionStatus,
    createEvent,
    mintTicket,
    verifyTicket,
    markTicketUsed,
    getEvent,
    getTicket,
    contractAddress: contractService.getContractAddress()
  };
}
