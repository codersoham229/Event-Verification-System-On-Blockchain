import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WalletConnect } from '@/components/wallet-connect';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { QRScanner } from '@/components/qr-scanner';
import { TransactionStatus } from '@/components/transaction-status';
import { DashboardLink } from '@/components/dashboard-link';

import { useWallet } from '@/hooks/use-wallet';
import { useContract } from '@/hooks/use-contract';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Event, Ticket } from '@/types/web3';
import { 
  Calendar, 
  Ticket as TicketIcon, 
  Shield, 
  Box,
  Plus,
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Medal,
  Info,
  LogOut,
  User as UserIcon,
  Mail,
  Send
} from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);
  const { walletState } = useWallet();
  const { 
    transactionStatus, 
    resetTransactionStatus,
    createEvent, 
    mintTicket, 
    verifyTicket, 
    markTicketUsed,
    getEvent,
    contractAddress
  } = useContract();
  const { toast } = useToast();

  // Form states
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    date: '',
    ticketPrice: '',
    maxTickets: ''
  });

  const [ticketForm, setTicketForm] = useState({
    eventId: '',
    attendeeName: ''
  });

  const [verifyForm, setVerifyForm] = useState({
    eventId: '',
    ticketId: '',
    walletAddress: ''
  });

  // State for created event/ticket
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string>('');
  const [mintedTicket, setMintedTicket] = useState<Ticket | null>(null);
  const [mintedTicketId, setMintedTicketId] = useState<string>('');
  const [eventForTicket, setEventForTicket] = useState<Event | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    owner: string;
    attendeeName: string;
    isUsed: boolean;
    event?: Event;
  } | null>(null);

  // QR Scanner state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrScanType, setQrScanType] = useState<'event' | 'verify'>('event');
  
  // Email sending state
  const [emailAddresses, setEmailAddresses] = useState<string>('');
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [activeTab, setActiveTab] = useState('create');



  // Handle event creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletState.isConnected || !walletState.isCorrectChain) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet and switch to Sepolia testnet.",
        variant: "destructive"
      });
      return;
    }

    const result = await createEvent(
      eventForm.name,
      eventForm.description,
      new Date(eventForm.date),
      eventForm.ticketPrice,
      parseInt(eventForm.maxTickets)
    );

    if (result) {
      setCreatedEventId(result.eventId);
      // Don't try to load event details immediately, just show success with the ID
      // The event details loading is causing issues with the smart contract
      const eventData = {
        id: result.eventId,
        name: eventForm.name,
        description: eventForm.description,
        date: new Date(eventForm.date).toISOString(),
        ticketPrice: eventForm.ticketPrice,
        maxTickets: parseInt(eventForm.maxTickets),
        ticketsSold: 0,
        organizer: walletState.address || ''
      };
      setCreatedEvent(eventData);

      // Sync event to Supabase for user dashboard
      try {
        const { error } = await supabase
          .from('events')
          .insert({
            event_id: parseInt(result.eventId),
            event_name: eventForm.name,
            event_date: new Date(eventForm.date).toISOString(),
            location: 'TBA',
            max_capacity: parseInt(eventForm.maxTickets),
            ticket_price: parseFloat(eventForm.ticketPrice),
            organizer_address: walletState.address,
            total_tickets_sold: 0,
            is_active: true
          });

        if (error) {
          console.error('Failed to sync event to database:', error);
        } else {
          toast({
            title: "Event Synced",
            description: "Event is now visible to users"
          });
        }
      } catch (err) {
        console.error('Error syncing event:', err);
      }
    }
  };

  // Handle ticket minting
  const handleMintTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletState.isConnected || !walletState.isCorrectChain) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet and switch to Sepolia testnet.",
        variant: "destructive"
      });
      return;
    }

    // Use the ticket price from created event if available, otherwise use a default
    const ticketPrice = createdEvent?.ticketPrice || "0.001";
    
    const result = await mintTicket(ticketForm.eventId, ticketForm.attendeeName);

    if (result) {
      setMintedTicketId(result.ticketId);
      // Create ticket object for display
      const ticketData = {
        id: result.ticketId,
        eventId: ticketForm.eventId,
        tokenId: result.ticketId,
        owner: walletState.address || '',
        attendeeName: ticketForm.attendeeName,
        isUsed: false,
        mintedAt: new Date().toISOString(),
        transactionHash: result.transactionHash
      };
      setMintedTicket(ticketData);

      // Sync ticket to Supabase for user dashboard
      try {
        const { error } = await supabase
          .from('tickets')
          .insert({
            ticket_id: parseInt(result.ticketId),
            token_id: parseInt(result.ticketId),
            event_id: parseInt(ticketForm.eventId),
            owner_address: walletState.address,
            price: parseFloat(ticketPrice),
            is_used: false,
            transaction_hash: result.transactionHash
          });

        if (error) {
          console.error('Failed to sync ticket to database:', error);
        } else {
          toast({
            title: "Ticket Synced",
            description: "Ticket is now visible in user dashboard"
          });
        }
      } catch (err) {
        console.error('Error syncing ticket:', err);
      }
    }
  };

  // Handle ticket verification
  const handleVerifyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Verifying ticket with:', {
      eventId: verifyForm.eventId,
      ticketId: verifyForm.ticketId,
      walletAddress: verifyForm.walletAddress
    });
    
    const result = await verifyTicket(verifyForm.eventId, verifyForm.ticketId);

    if (result) {
      console.log('✅ Verification complete:', result);
      // Don't try to load event details to avoid the contract mismatch error
      setVerificationResult({
        ...result,
        event: undefined // Skip event details for now
      });
    }
  };

  // Handle email sending
  const handleSendEmails = async () => {
    if (!emailAddresses.trim()) {
      toast({
        title: "No Email Addresses",
        description: "Please enter at least one email address.",
        variant: "destructive"
      });
      return;
    }

    if (!mintedTicket || !mintedTicketId) {
      toast({
        title: "No Ticket",
        description: "Please mint a ticket first.",
        variant: "destructive"
      });
      return;
    }

    setSendingEmail(true);

    try {
      // Parse email addresses (comma or space separated)
      const emails = emailAddresses
        .split(/[,\s]+/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      if (emails.length === 0) {
        toast({
          title: "Invalid Email",
          description: "Please enter valid email addresses.",
          variant: "destructive"
        });
        setSendingEmail(false);
        return;
      }

      // Store email records in database
      for (const email of emails) {
        const { error } = await supabase
          .from('ticket_emails')
          .insert({
            ticket_id: parseInt(mintedTicketId),
            event_id: parseInt(mintedTicket.eventId),
            recipient_email: email,
            ticket_owner: mintedTicket.owner,
            attendee_name: mintedTicket.attendeeName,
            sent_at: new Date().toISOString(),
            qr_data: JSON.stringify({
              eventId: mintedTicket.eventId,
              ticketId: mintedTicketId,
              walletAddress: mintedTicket.owner
            })
          });

        if (error) {
          console.error('Failed to save email record:', error);
        }
      }

      toast({
        title: "Email Information Saved",
        description: `Ticket details for ${emails.length} email(s) have been recorded. The recipient(s) can access their ticket from their dashboard.`,
      });

      // Clear form
      setEmailAddresses('');
      setShowEmailSection(false);
      
    } catch (err) {
      console.error('Error sending emails:', err);
      toast({
        title: "Error",
        description: "Failed to process email addresses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle QR scan
  const handleQRScan = (data: string) => {
    try {
      console.log('📱 Scanned QR code data:', data);
      
      // Try to parse as JSON first (new format)
      try {
        const parsed = JSON.parse(data);
        console.log('✅ Parsed QR as JSON:', parsed);
        
        if (parsed.eventId) {
          if (qrScanType === 'event') {
            setTicketForm(prev => ({ ...prev, eventId: parsed.eventId }));
            toast({
              title: "Event QR Scanned",
              description: `Event ID ${parsed.eventId} loaded`
            });
          } else if (qrScanType === 'verify') {
            setVerifyForm(prev => ({
              ...prev,
              eventId: parsed.eventId,
              ticketId: parsed.ticketId || '',
              walletAddress: parsed.walletAddress || ''
            }));
            toast({
              title: "Ticket QR Scanned",
              description: `Event ${parsed.eventId}, Ticket ${parsed.ticketId}`
            });
          }
          setIsQRScannerOpen(false);
          return;
        }
      } catch (e) {
        // Not JSON, try old format
        console.log('Not JSON, trying old colon-separated format');
      }
      
      // Fall back to old format: "event:12345:ticket:67890:wallet:0x789ABC"
      if (data.startsWith('event:')) {
        const parts = data.split(':');
        if (qrScanType === 'event') {
          setTicketForm(prev => ({ ...prev, eventId: parts[1] }));
        } else if (qrScanType === 'verify') {
          setVerifyForm(prev => ({
            ...prev,
            eventId: parts[1],
            ticketId: parts[3] || '',
            walletAddress: parts[5] || ''
          }));
        }
        setIsQRScannerOpen(false);
        toast({
          title: "QR Code Scanned",
          description: "Data has been filled in the form."
        });
      } else {
        throw new Error('Unrecognized QR format');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        title: "Invalid QR Code",
        description: "Could not parse QR code data.",
        variant: "destructive"
      });
    }
  };

  // Don't auto-load event details when typing - it causes error popups
  // User just needs to enter the correct Event ID to mint
  /*
  useEffect(() => {
    if (ticketForm.eventId && ticketForm.eventId !== eventForTicket?.id && ticketForm.eventId.length > 0) {
      const eventIdNum = parseInt(ticketForm.eventId);
      if (!isNaN(eventIdNum) && eventIdNum > 0) {
        getEvent(ticketForm.eventId).then(event => {
          if (event) {
            setEventForTicket(event);
          }
        }).catch(err => {
          console.log('Event not found yet:', ticketForm.eventId);
        });
      }
    }
  }, [ticketForm.eventId]);
  */

  // Generate QR code data as JSON for verification page
  const getEventQRData = (eventId: string) => JSON.stringify({ eventId });
  const getTicketQRData = (eventId: string, ticketId: string, walletAddress: string) => 
    JSON.stringify({ eventId, ticketId, walletAddress });

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    setLocation('/');
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Box className="text-primary text-2xl" />
                <h1 className="text-xl font-bold text-slate-900">BlockTix</h1>
              </div>
              <Badge variant="outline" className="text-xs">
                Sepolia Testnet
              </Badge>
              {user && (
                <Badge variant="secondary" className="text-xs">
                  <UserIcon className="h-3 w-3 mr-1" />
                  {user.user_metadata?.name || user.email}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <DashboardLink />
              <WalletConnect />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <Card className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
              <TabsTrigger 
                value="create" 
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-slate-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
                data-testid="tab-create-event"
              >
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </TabsTrigger>
              <TabsTrigger 
                value="generate" 
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-slate-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
                data-testid="tab-generate-ticket"
              >
                <TicketIcon className="w-4 h-4" />
                <span>Generate Ticket</span>
              </TabsTrigger>
              <TabsTrigger 
                value="verify" 
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-slate-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
                data-testid="tab-verify-ticket"
              >
                <Shield className="w-4 h-4" />
                <span>Verify Ticket</span>
              </TabsTrigger>
            </TabsList>

            {/* Create Event Tab */}
            <TabsContent value="create" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* Create Event Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Create New Event</span>
                    </CardTitle>
                    <p className="text-slate-600">Deploy your event to the blockchain and generate a unique event ID</p>
                  </CardHeader>
                  <CardContent>
                    {/* Contract status notice */}
                    {contractAddress === "0x0000000000000000000000000000000000000000" ? (
                      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                        <Info className="w-4 h-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>Smart Contract Required:</strong> To use this app, deploy the contract from <code>contracts/EventTicketing.sol</code> to Sepolia testnet using{' '}
                          <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer" className="underline">
                            Remix IDE
                          </a>, then set <code>VITE_CONTRACT_ADDRESS</code> in your environment.{' '}
                          <a href="/DEPLOYMENT.md" className="underline">View full guide</a>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="mb-4 border-green-200 bg-green-50">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Contract Connected:</strong> Smart contract deployed at{' '}
                          <code className="bg-green-100 px-1 rounded text-xs">{contractAddress}</code> on Sepolia testnet.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <form onSubmit={handleCreateEvent} className="space-y-4">
                      <div>
                        <Label htmlFor="eventName">Event Name</Label>
                        <Input
                          id="eventName"
                          value={eventForm.name}
                          onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter event name"
                          required
                          data-testid="input-event-name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="eventDescription">Description</Label>
                        <Textarea
                          id="eventDescription"
                          value={eventForm.description}
                          onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your event"
                          rows={4}
                          required
                          data-testid="textarea-event-description"
                        />
                      </div>

                      <div>
                        <Label htmlFor="eventDate">Event Date</Label>
                        <Input
                          id="eventDate"
                          type="datetime-local"
                          value={eventForm.date}
                          onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                          required
                          data-testid="input-event-date"
                        />
                      </div>

                      <div>
                        <Label htmlFor="ticketPrice">Ticket Price (ETH)</Label>
                        <Input
                          id="ticketPrice"
                          type="number"
                          step="0.001"
                          value={eventForm.ticketPrice}
                          onChange={(e) => setEventForm(prev => ({ ...prev, ticketPrice: e.target.value }))}
                          placeholder="0.001"
                          required
                          data-testid="input-ticket-price"
                        />
                      </div>

                      <div>
                        <Label htmlFor="maxTickets">Max Tickets</Label>
                        <Input
                          id="maxTickets"
                          type="number"
                          value={eventForm.maxTickets}
                          onChange={(e) => setEventForm(prev => ({ ...prev, maxTickets: e.target.value }))}
                          placeholder="100"
                          required
                          data-testid="input-max-tickets"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={!walletState.isConnected || !walletState.isCorrectChain}
                        data-testid="button-create-event"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Deploy Event to Blockchain
                      </Button>
                    </form>

                    {transactionStatus.status !== 'idle' && activeTab === 'create' && (
                      <div className="mt-4">
                        <TransactionStatus 
                          status={transactionStatus} 
                          onClose={resetTransactionStatus}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event Created Success */}
                {createdEvent && (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="text-secondary text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Event Created Successfully!</h3>
                        <p className="text-slate-600 mb-6">Your event has been deployed to the Sepolia blockchain</p>

                        {/* Event Details Card */}
                        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Event ID:</span>
                              <p className="font-mono font-medium text-slate-900" data-testid="text-created-event-id">
                                {createdEventId}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Price:</span>
                              <p className="font-medium text-slate-900" data-testid="text-created-event-price">
                                {createdEvent.ticketPrice} ETH
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Max Tickets:</span>
                              <p className="font-medium text-slate-900" data-testid="text-created-event-max-tickets">
                                {createdEvent.maxTickets}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Available:</span>
                              <p className="font-medium text-slate-900" data-testid="text-created-event-available">
                                {createdEvent.maxTickets - createdEvent.ticketsSold}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <QRCodeDisplay
                      data={getEventQRData(createdEventId)}
                      title="Event QR Code"
                      subtitle={`event:${createdEventId}`}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Generate Ticket Tab */}
            <TabsContent value="generate" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* Generate Ticket Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TicketIcon className="w-5 h-5" />
                      <span>Mint Event Ticket</span>
                    </CardTitle>
                    <p className="text-slate-600">Purchase and mint a blockchain-verified ticket NFT</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleMintTicket} className="space-y-4">
                      <div>
                        <Label htmlFor="eventId">Event ID</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="eventId"
                            value={ticketForm.eventId}
                            onChange={(e) => setTicketForm(prev => ({ ...prev, eventId: e.target.value }))}
                            placeholder="Enter event ID or scan QR"
                            required
                            data-testid="input-event-id"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setQrScanType('event');
                              setIsQRScannerOpen(true);
                            }}
                            data-testid="button-scan-event-qr"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="attendeeName">Attendee Name</Label>
                        <Input
                          id="attendeeName"
                          value={ticketForm.attendeeName}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, attendeeName: e.target.value }))}
                          placeholder="Enter your full name"
                          required
                          data-testid="input-attendee-name"
                        />
                      </div>

                      {/* Event Info Display */}
                      {eventForTicket && (
                        <Card className="bg-slate-50">
                          <CardHeader>
                            <CardTitle className="text-base">Event Details</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Event Name:</span>
                              <span className="font-medium" data-testid="text-event-name">
                                {eventForTicket.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Date:</span>
                              <span className="font-medium" data-testid="text-event-date">
                                {new Date(eventForTicket.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Price:</span>
                              <span className="font-medium text-primary" data-testid="text-event-price">
                                {eventForTicket.ticketPrice} ETH
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Available:</span>
                              <span className="font-medium text-secondary" data-testid="text-event-available">
                                {eventForTicket.maxTickets - eventForTicket.ticketsSold}/{eventForTicket.maxTickets}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {!walletState.isConnected && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Connect your MetaMask wallet to mint tickets. The NFT will be tied to your wallet address.
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full bg-secondary hover:bg-secondary/90"
                        disabled={!walletState.isConnected || !walletState.isCorrectChain}
                        data-testid="button-mint-ticket"
                      >
                        <TicketIcon className="w-4 h-4 mr-2" />
                        Mint Ticket NFT {eventForTicket && `(${eventForTicket.ticketPrice} ETH)`}
                      </Button>
                    </form>

                    {transactionStatus.status !== 'idle' && activeTab === 'generate' && (
                      <div className="mt-4">
                        <TransactionStatus 
                          status={transactionStatus} 
                          onClose={resetTransactionStatus}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ticket Minted Success */}
                {mintedTicket && (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Medal className="text-accent text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Ticket Minted Successfully!</h3>
                        <p className="text-slate-600 mb-6">Your NFT ticket has been created and stored on the blockchain</p>

                        {/* Ticket Details Card */}
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 mb-6 border border-purple-200">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-slate-500">Ticket ID:</span>
                              <p className="font-mono font-medium text-slate-900" data-testid="text-minted-ticket-id">
                                {mintedTicketId}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Owner:</span>
                              <p className="font-mono font-medium text-slate-900 truncate" data-testid="text-minted-ticket-owner">
                                {mintedTicket.owner.slice(0, 6)}...{mintedTicket.owner.slice(-4)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Status:</span>
                              <Badge className="bg-green-100 text-green-800" data-testid="status-minted-ticket">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Valid
                              </Badge>
                            </div>
                            <div>
                              <span className="text-slate-500">Event:</span>
                              <p className="font-medium text-slate-900" data-testid="text-minted-ticket-event">
                                {ticketForm.eventId}
                              </p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-slate-700" data-testid="text-minted-attendee-name">
                              {mintedTicket.attendeeName}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <QRCodeDisplay
                      data={getTicketQRData(mintedTicket.eventId, mintedTicketId, mintedTicket.owner)}
                      title="Your Ticket QR Code"
                      subtitle={`event:${mintedTicket.eventId}:ticket:${mintedTicketId}:wallet:${mintedTicket.owner.slice(0, 8)}...`}
                    />

                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-blue-800">
                        This ticket is now in your MetaMask wallet as an NFT. Present the QR code at the event for verification.
                        <br /><br />
                        <strong>To verify this ticket:</strong><br />
                        • Scan the QR code above, OR<br />
                        • Manually enter: Event ID = <code className="bg-blue-100 px-1 rounded">{mintedTicket.eventId}</code>, Ticket ID = <code className="bg-blue-100 px-1 rounded">{mintedTicketId}</code>
                      </AlertDescription>
                    </Alert>

                    {/* Email Sending Section */}
                    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-900">
                          <Mail className="w-5 h-5" />
                          <span>Share Ticket via Email</span>
                        </CardTitle>
                        <p className="text-slate-600 text-sm">
                          Send this ticket to recipients via their email addresses
                        </p>
                      </CardHeader>
                      <CardContent>
                        {!showEmailSection ? (
                          <Button
                            onClick={() => setShowEmailSection(true)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Send Ticket to Email Recipients
                          </Button>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="emailAddresses" className="text-indigo-900">
                                Email Addresses
                              </Label>
                              <Textarea
                                id="emailAddresses"
                                value={emailAddresses}
                                onChange={(e) => setEmailAddresses(e.target.value)}
                                placeholder="Enter email addresses separated by commas or spaces&#10;Example: user1@gmail.com, user2@gmail.com, user3@gmail.com"
                                rows={4}
                                className="mt-2 bg-white border-indigo-200 focus:border-indigo-500"
                              />
                              <p className="text-xs text-slate-500 mt-2">
                                You can add multiple email addresses separated by commas or spaces
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={handleSendEmails}
                                disabled={sendingEmail || !emailAddresses.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                              >
                                {sendingEmail ? (
                                  <>Processing...</>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send to Recipients
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowEmailSection(false);
                                  setEmailAddresses('');
                                }}
                                variant="outline"
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                Cancel
                              </Button>
                            </div>

                            <Alert className="bg-indigo-100 border-indigo-300">
                              <Info className="h-4 w-4 text-indigo-700" />
                              <AlertDescription className="text-indigo-800 text-sm">
                                Recipients will be able to access their ticket details from their dashboard. 
                                The ticket QR code and event information will be available for them to view and use.
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Verify Ticket Tab */}
            <TabsContent value="verify" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* Verify Ticket Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Verify Event Ticket</span>
                    </CardTitle>
                    <p className="text-slate-600">Scan or enter ticket details to verify authenticity on the blockchain</p>
                  </CardHeader>
                  <CardContent>
                    {/* QR Scanner Section */}
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
                      <Camera className="w-16 h-16 bg-slate-100 rounded-full p-4 mx-auto mb-4 text-slate-400" />
                      <h4 className="font-medium text-slate-900 mb-2">Scan QR Code</h4>
                      <p className="text-slate-600 text-sm mb-4">Point your camera at the ticket QR code or upload an image</p>
                      <Button
                        onClick={() => {
                          setQrScanType('verify');
                          setIsQRScannerOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90"
                        data-testid="button-start-qr-scan"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Start Scanner
                      </Button>
                    </div>

                    <div className="flex items-center mb-6">
                      <div className="flex-1 border-t border-slate-300"></div>
                      <span className="px-4 text-slate-500 text-sm">OR</span>
                      <div className="flex-1 border-t border-slate-300"></div>
                    </div>

                    {/* Manual Entry Section */}
                    <form onSubmit={handleVerifyTicket} className="space-y-4">
                      <div>
                        <Label htmlFor="verifyEventId">Event ID</Label>
                        <Input
                          id="verifyEventId"
                          value={verifyForm.eventId}
                          onChange={(e) => setVerifyForm(prev => ({ ...prev, eventId: e.target.value }))}
                          placeholder="Enter event ID"
                          required
                          data-testid="input-verify-event-id"
                        />
                      </div>

                      <div>
                        <Label htmlFor="verifyTicketId">Ticket ID</Label>
                        <Input
                          id="verifyTicketId"
                          value={verifyForm.ticketId}
                          onChange={(e) => setVerifyForm(prev => ({ ...prev, ticketId: e.target.value }))}
                          placeholder="Enter ticket ID"
                          required
                          data-testid="input-verify-ticket-id"
                        />
                      </div>

                      <div>
                        <Label htmlFor="verifyWalletAddress">Wallet Address (Optional)</Label>
                        <Input
                          id="verifyWalletAddress"
                          value={verifyForm.walletAddress}
                          onChange={(e) => setVerifyForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                          placeholder="0x..."
                          data-testid="input-verify-wallet-address"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-accent hover:bg-accent/90"
                        data-testid="button-verify-ticket"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Verify on Blockchain
                      </Button>
                    </form>

                    {transactionStatus.status !== 'idle' && activeTab === 'verify' && (
                      <div className="mt-4">
                        <TransactionStatus 
                          status={transactionStatus} 
                          onClose={resetTransactionStatus}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verification Results */}
                {verificationResult && (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          verificationResult.valid ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {verificationResult.valid ? (
                            <CheckCircle className="text-green-600 text-2xl" />
                          ) : (
                            <XCircle className="text-red-600 text-2xl" />
                          )}
                        </div>
                        
                        <h3 className={`text-xl font-bold mb-2 ${
                          verificationResult.valid ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {verificationResult.valid ? '✅ Valid Ticket' : '❌ Invalid Ticket'}
                        </h3>
                        
                        <p className="text-slate-600 mb-6">
                          {verificationResult.valid 
                            ? 'This ticket has been verified on the blockchain'
                            : 'This ticket could not be verified on the blockchain'
                          }
                        </p>

                        {verificationResult.valid ? (
                          <>
                            {/* Valid Ticket Details */}
                            <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
                              <div className="grid grid-cols-1 gap-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Ticket ID:</span>
                                  <span className="font-mono font-medium" data-testid="text-verified-ticket-id">
                                    {verifyForm.ticketId}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Owner:</span>
                                  <span className="font-mono font-medium" data-testid="text-verified-ticket-owner">
                                    {verificationResult.owner.slice(0, 6)}...{verificationResult.owner.slice(-4)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Attendee:</span>
                                  <span className="font-medium" data-testid="text-verified-attendee-name">
                                    {verificationResult.attendeeName}
                                  </span>
                                </div>
                                {verificationResult.event && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Event:</span>
                                    <span className="font-medium" data-testid="text-verified-event-name">
                                      {verificationResult.event.name}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Status:</span>
                                  <Badge 
                                    className={`${
                                      verificationResult.isUsed 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}
                                    data-testid="status-verified-ticket"
                                  >
                                    {verificationResult.isUsed ? (
                                      <>
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Used
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Not Used
                                      </>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex space-x-3">
                              {!verificationResult.isUsed && (
                                <Button
                                  onClick={() => markTicketUsed(verifyForm.eventId, verifyForm.ticketId)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  data-testid="button-mark-ticket-used"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Used
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                className="flex-1"
                                data-testid="button-print-badge"
                              >
                                Print Badge
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Invalid Ticket Warning */}
                            <Alert className="bg-red-50 border-red-200 mb-6">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-left">
                                <p className="text-red-800 font-medium text-sm mb-2">Possible Issues:</p>
                                <ul className="text-red-700 text-sm space-y-1">
                                  <li>• Ticket ID does not exist on blockchain</li>
                                  <li>• Ticket has already been used</li>
                                  <li>• Wallet address mismatch</li>
                                  <li>• Fraudulent or counterfeit ticket</li>
                                </ul>
                              </AlertDescription>
                            </Alert>

                            <Button 
                              variant="destructive" 
                              className="w-full"
                              data-testid="button-report-fraudulent-ticket"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Report Fraudulent Ticket
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onScan={handleQRScan}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </div>
  );
}
