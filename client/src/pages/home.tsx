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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { WalletConnect } from '@/components/wallet-connect';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { QRScanner } from '@/components/qr-scanner';
import { TransactionStatus } from '@/components/transaction-status';

import { useWallet } from '@/hooks/use-wallet';
import { useContract } from '@/hooks/use-contract';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { contractService } from '@/lib/contract';
import { ethers } from 'ethers';
import type { Event as EventType, Ticket as TicketType } from '@/types/web3';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
  MapPin,
  FileText,
  MessageCircle,
  Settings,
  Edit,
  Save,
  X,
  BarChart3,
  LayoutDashboard
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
    date: undefined as Date | undefined,
    location: '',
    ticketPrice: '',
    maxTickets: '',
    isPublic: true
  });
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const [ticketForm, setTicketForm] = useState({
    eventId: '',
    emails: ''
  });
  const [emailForm, setEmailForm] = useState({
    eventId: '',
    emails: ''
  });
  const [sendingEmails, setSendingEmails] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [verifyForm, setVerifyForm] = useState({
    eventId: '',
    ticketId: '',
    walletAddress: ''
  });

  // State for created event/ticket
  const [createdEvent, setCreatedEvent] = useState<EventType | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string>('');
  const [mintedTicket, setMintedTicket] = useState<TicketType | null>(null);
  const [mintedTicketId, setMintedTicketId] = useState<string>('');
  const [eventForTicket, setEventForTicket] = useState<EventType | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    owner: string;
    attendeeName: string;
    isUsed: boolean;
    event?: EventType;
  } | null>(null);

  // QR Scanner state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrScanType, setQrScanType] = useState<'event' | 'verify'>('event');

  const [activeTab, setActiveTab] = useState('create');
  const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
  const [adRequests, setAdRequests] = useState<any[]>([]);
  const [activeSidebarSection, setActiveSidebarSection] = useState('tabs');
  
  // Organizer live stats
  const [orgStats, setOrgStats] = useState({
    totalEvents: 0,
    totalTicketsMinted: 0,
    ticketsUsed: 0,
    ticketsApproved: 0,
    totalRevenue: 0,
    pendingEnrollments: 0,
  });

  // Profile Settings
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', email: '', organization: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfileForm, setTempProfileForm] = useState({ username: '', email: '', organization: '' });

  // Initialize profile form
  useEffect(() => {
    if (user) {
      const userData = {
        username: user.user_metadata?.name || '',
        email: user.email || '',
        organization: user.user_metadata?.organization || ''
      };
      setProfileForm(userData);
      setTempProfileForm(userData);
    }
  }, [user]);

  // Fetch enrollment requests
  useEffect(() => {
    if (walletState.address) {
      fetchEnrollmentRequests();
    }
  }, [walletState.address]);

  // Load and poll ad requests from localStorage
  useEffect(() => {
    const loadAdRequests = () => {
      try {
        const requests = JSON.parse(localStorage.getItem('adRequests') || '[]');
        setAdRequests(requests);
      } catch (error) {
        console.error('Error loading ad requests:', error);
      }
    };

    // Initial load
    loadAdRequests();

    // Poll for new requests every 2 seconds
    const interval = setInterval(loadAdRequests, 2000);

    return () => clearInterval(interval);
  }, []);

  // Fetch organizer live stats
  const fetchOrgStats = async () => {
    try {
      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*');
      const allEvents = eventsData || [];

      // Fetch tickets
      const { data: ticketsData } = await supabase
        .from('ticket_emails')
        .select('*');
      const allTickets = ticketsData || [];

      // Calculate revenue
      let totalRevenue = 0;
      allEvents.forEach((event: any) => {
        const eventTickets = allTickets.filter((t: any) => t.event_id === event.id || t.event_id === event.event_id);
        const price = parseFloat(event.price || event.ticket_price || '0');
        totalRevenue += price * eventTickets.length;
      });

      setOrgStats({
        totalEvents: allEvents.length,
        totalTicketsMinted: allTickets.length,
        ticketsUsed: allTickets.filter((t: any) => t.status === 'used').length,
        ticketsApproved: allTickets.filter((t: any) => t.status === 'approved').length,
        totalRevenue,
        pendingEnrollments: enrollmentRequests.filter(r => r.status === 'pending').length,
      });
    } catch (err) {
      console.error('Error fetching org stats:', err);
    }
  };

  useEffect(() => {
    fetchOrgStats();

    // Realtime subscriptions for live updates
    const eventsChannel = supabase
      .channel('org-events-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchOrgStats())
      .subscribe();

    const ticketsChannel = supabase
      .channel('org-tickets-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_emails' }, () => fetchOrgStats())
      .subscribe();

    const enrollChannel = supabase
      .channel('org-enroll-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_requests' }, () => {
        fetchOrgStats();
        fetchEnrollmentRequests();
      })
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
      ticketsChannel.unsubscribe();
      enrollChannel.unsubscribe();
    };
  }, []);

  const fetchEnrollmentRequests = async () => {
    try {
      // Fetch requests for events created by this organizer's wallet
      // OR for demo events (to allow testing)
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select('*')
        .or(`organizer_address.eq.${walletState.address},organizer_address.eq.0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
        .order('requested_at', { ascending: false });

      if (data) {
        setEnrollmentRequests(data);
      }
    } catch (error) {
      console.error('Error fetching enrollment requests:', error);
    }
  };

  const handleApproveRequest = async (request: any) => {
    if (!walletState.isConnected || !walletState.isCorrectChain) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet and switch to Sepolia testnet to mint tickets.",
        variant: "destructive"
      });
      return;
    }

    try {
      let ticketPrice = '0.001'; // Default ticket price

      // Check if it's a demo event (ID >= 9990)
      if (request.event_id >= 9990) {
        // Use hardcoded prices for demo events
        const demoPrices: Record<number, string> = {
          9999: '0.05',
          9998: '0.03',
          9997: '0.08',
          9996: '0.06',
          9995: '0.0',
          9994: '0.02',
          9993: '0.0',
          9992: '0.04',
          9991: '0.0',
          9990: '0.1'
        };
        ticketPrice = demoPrices[request.event_id] || '0.001';
      } else {
        // Fetch event details from Supabase for real events
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('price')
          .eq('id', request.event_id)
          .single();

        if (eventError || !eventData) {
          throw new Error("Could not fetch event details");
        }

        ticketPrice = eventData.price;
      }

      // Hash the email for privacy — never store raw email on public blockchain
      const emailHash = ethers.keccak256(ethers.toUtf8Bytes(request.requester_email.toLowerCase().trim()));

      toast({
        title: "Minting NFT Ticket...",
        description: "Please confirm the transaction in MetaMask",
      });

      // Mint NFT on blockchain
      const mintResult = await contractService.mintTicket(
        request.event_id.toString(),
        emailHash,
        ticketPrice
      );

      // Build QR data as a verification URL
      const verifyUrl = `${window.location.origin}/verify-ticket?eventId=${request.event_id}&ticketId=${mintResult.ticketId}`;

      // Create ticket for the user in Supabase
      const { error: ticketError } = await supabase
        .from('ticket_emails')
        .insert({
          event_id: request.event_id,
          recipient_email: request.requester_email,
          ticket_id: mintResult.ticketId,
          unique_hash: mintResult.transactionHash,
          qr_data: verifyUrl,
          status: 'approved'
        });

      if (ticketError) throw ticketError;

      // Update request status
      const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({ status: 'approved', responded_at: new Date().toISOString() })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({
        title: "Request Approved! ✅",
        description: `NFT ticket minted and sent to ${request.requester_email}`,
      });

      fetchEnrollmentRequests();
      fetchOrgStats();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Approval Failed",
        description: error.reason || error.message || "Could not mint ticket",
        variant: "destructive"
      });
    }
  };

  const handleDeclineRequest = async (request: any) => {
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .update({ status: 'declined' })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Request Declined",
        description: `Declined enrollment for ${request.requester_email}`,
      });

      fetchEnrollmentRequests();
      fetchOrgStats();
    } catch (error: any) {
      toast({
        title: "Decline Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle Excel/CSV file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const text = await file.text();
      let emails: string[] = [];

      // Check if it's CSV or try to parse as text
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        // Parse CSV - handle both comma and newline separated
        const lines = text.split(/[\r\n]+/);
        emails = lines
          .map(line => {
            // Try to extract email from CSV (could be in any column)
            const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            return emailMatch ? emailMatch[0] : line.trim();
          })
          .filter(email => email && email.includes('@'));
      } else {
        // Try to extract all emails from any text file
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        emails = text.match(emailRegex) || [];
      }

      if (emails.length === 0) {
        toast({
          title: "No Emails Found",
          description: "No valid email addresses found in the file.",
          variant: "destructive"
        });
        return;
      }

      // Remove duplicates
      const uniqueEmails = [...new Set(emails)];

      // Update the form with emails (one per line for better readability)
      setTicketForm(prev => ({
        ...prev,
        emails: uniqueEmails.join('\n')
      }));

      toast({
        title: "File Loaded Successfully!",
        description: `Found ${uniqueEmails.length} unique email address(es).`,
      });
    } catch (error: any) {
      toast({
        title: "File Upload Failed",
        description: error.message || "Could not read the file.",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Handle location input with smart suggestions
  const handleLocationChange = (value: string) => {
    setEventForm(prev => ({ ...prev, location: value }));
    
    if (value.length >= 2) {
      const query = value.toLowerCase();
      
      // Comprehensive venue database
      const venues: string[] = [
        // India - Major Cities & Venues
        'Pragati Maidan, New Delhi, India',
        'India Expo Centre, Greater Noida, India',
        'Jawaharlal Nehru Stadium, New Delhi, India',
        'Thyagaraj Sports Complex, New Delhi, India',
        'Indira Gandhi Arena, New Delhi, India',
        'Talkatora Stadium, New Delhi, India',
        'Siri Fort Auditorium, New Delhi, India',
        'NSCI Dome, Mumbai, India',
        'Bombay Exhibition Centre, Mumbai, India',
        'Jio World Convention Centre, Mumbai, India',
        'Nesco Centre, Mumbai, India',
        'Wankhede Stadium, Mumbai, India',
        'DY Patil Stadium, Navi Mumbai, India',
        'Bangalore International Exhibition Centre, Bengaluru, India',
        'Palace Grounds, Bengaluru, India',
        'Gayatri Vihar, Bengaluru, India',
        'Manpho Convention Centre, Bengaluru, India',
        'HITEX Exhibition Centre, Hyderabad, India',
        'Shilpakala Vedika, Hyderabad, India',
        'Hyderabad International Convention Centre, Hyderabad, India',
        'Chennai Trade Centre, Chennai, India',
        'Chennai Convention Centre, Chennai, India',
        'Nehru Indoor Stadium, Chennai, India',
        'Biswa Bangla Convention Centre, Kolkata, India',
        'Netaji Indoor Stadium, Kolkata, India',
        'Science City Auditorium, Kolkata, India',
        'Pune International Exhibition Centre, Pune, India',
        'Balewadi Sports Complex, Pune, India',
        'Lavasa Convention Centre, Pune, India',
        'Gujarat University Convention Hall, Ahmedabad, India',
        'Mahatma Mandir Convention Centre, Gandhinagar, India',
        'Jaipur Exhibition & Convention Centre, Jaipur, India',
        'Birla Auditorium, Jaipur, India',
        'Chandigarh University Auditorium, Chandigarh, India',
        // USA
        'Madison Square Garden, New York, NY',
        'Jacob Javits Center, New York, NY',
        'Moscone Center, San Francisco, CA',
        'Los Angeles Convention Center, Los Angeles, CA',
        'McCormick Place, Chicago, IL',
        'Las Vegas Convention Center, Las Vegas, NV',
        'George R. Brown Convention Center, Houston, TX',
        'Austin Convention Center, Austin, TX',
        'San Diego Convention Center, San Diego, CA',
        'Miami Beach Convention Center, Miami, FL',
        'Seattle Convention Center, Seattle, WA',
        'Boston Convention Center, Boston, MA',
        // Europe
        'ExCeL London, London, UK',
        'O2 Arena, London, UK',
        'Messe Berlin, Berlin, Germany',
        'Paris Expo Porte de Versailles, Paris, France',
        'RAI Amsterdam, Amsterdam, Netherlands',
        'Fira Barcelona, Barcelona, Spain',
        // Asia
        'Tokyo Big Sight, Tokyo, Japan',
        'Marina Bay Sands, Singapore',
        'Dubai World Trade Centre, Dubai, UAE',
        'COEX Convention Centre, Seoul, South Korea',
        // Venue Types
        'Convention Center',
        'Exhibition Hall',
        'Conference Hall',
        'Stadium',
        'Indoor Arena',
        'Outdoor Arena',
        'Amphitheater',
        'Auditorium',
        'Theater',
        'Hotel Ballroom',
        'Community Center',
        'University Campus',
        'Sports Complex',
        'Town Hall',
        'Banquet Hall',
        'Open Air Ground',
        'Cultural Centre',
        'Co-working Space',
        'Rooftop Venue',
        'Beach Venue'
      ];
      
      // Split query into words for multi-word matching
      const queryWords = query.split(/\s+/).filter(w => w.length > 0);
      
      // Score-based matching: venues matching more query words rank higher
      const scored = venues.map(venue => {
        const lower = venue.toLowerCase();
        let score = 0;
        for (const word of queryWords) {
          if (lower.includes(word)) score += 1;
          if (lower.startsWith(word)) score += 0.5;
        }
        return { venue, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(item => item.venue);
      
      setLocationSuggestions(scored);
      setShowLocationSuggestions(scored.length > 0);
    } else {
      setShowLocationSuggestions(false);
      setLocationSuggestions([]);
    }
  };


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

    if (!eventForm.date) {
      toast({
        title: "Date Required",
        description: "Please select an event date and time.",
        variant: "destructive"
      });
      return;
    }

    const result = await createEvent(
      eventForm.name,
      eventForm.description,
      eventForm.date,
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
        date: eventForm.date.toISOString(),
        location: eventForm.location,
        ticketPrice: eventForm.ticketPrice,
        maxTickets: parseInt(eventForm.maxTickets),
        ticketsSold: 0,
        organizer: walletState.address || ''
      };
      setCreatedEvent(eventData);

      // Auto-fill event ID in ticket form
      setTicketForm(prev => ({ ...prev, eventId: result.eventId }));

      // Switch to ticket generation tab
      setActiveTab('generate');

      // Sync event to Supabase for user dashboard
      try {
        const { error } = await supabase
          .from('events')
          .insert({
            name: eventForm.name,
            description: eventForm.description,
            date: eventForm.date.toISOString(),
            location: eventForm.location || 'Location TBA',
            total_tickets: parseInt(eventForm.maxTickets),
            available_tickets: parseInt(eventForm.maxTickets),
            price: eventForm.ticketPrice,
            organizer_address: walletState.address,
            transaction_hash: result.transactionHash,
            is_public: eventForm.isPublic
          });

        if (error) {
          console.log('Note: Event sync skipped (database schema may need update)');
        } else {
          // Immediately refresh stats after event creation
          fetchOrgStats();
        }
      } catch (err) {
        console.log('Note: Event sync skipped');
      }
    }
  };

  // Handle ticket generation with emails — mints NFT on blockchain for each ticket
  const handleMintTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketForm.eventId || !ticketForm.emails) {
      toast({
        title: "Required Fields",
        description: "Please enter event ID and email addresses.",
        variant: "destructive"
      });
      return;
    }

    if (!walletState.isConnected || !walletState.isCorrectChain) {
      toast({
        title: "Wallet Required",
        description: "Connect your MetaMask wallet and switch to Sepolia testnet to mint tickets on blockchain.",
        variant: "destructive"
      });
      return;
    }

    setSendingEmails(true);
    const emailList = ticketForm.emails.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    
    try {
      let successCount = 0;
      let errorMessages: string[] = [];

      for (let i = 0; i < emailList.length; i++) {
        const email = emailList[i];
        try {
          toast({
            title: `Minting ticket ${i + 1}/${emailList.length}`,
            description: `Minting NFT for ${email}... Confirm in MetaMask.`,
          });

          // Hash the email for privacy — never store raw email on public blockchain
          const emailHash = ethers.keccak256(ethers.toUtf8Bytes(email.toLowerCase().trim()));

          // Mint NFT on blockchain — attendeeName = hashed email (privacy-preserving)
          const mintResult = await contractService.mintTicket(
            ticketForm.eventId,
            emailHash,
            eventForTicket?.ticketPrice
          );

          // Build QR data as a verification URL
          const verifyUrl = `${window.location.origin}/verify-ticket?eventId=${ticketForm.eventId}&ticketId=${mintResult.ticketId}`;

          // Sync to Supabase for user dashboard
          try {
            await supabase
              .from('ticket_emails')
              .insert({
                event_id: parseInt(ticketForm.eventId),
                recipient_email: email,
                ticket_id: mintResult.ticketId,
                unique_hash: mintResult.transactionHash,
                qr_data: verifyUrl
              });
          } catch (dbErr) {
            console.warn('Supabase sync skipped:', dbErr);
          }

          successCount++;
        } catch (err: any) {
          console.error(`Error minting ticket for ${email}:`, err);
          const msg = err.reason || err.message || 'Unknown error';
          errorMessages.push(`${email}: ${msg}`);
          // If user rejected MetaMask, stop the loop
          if (msg.includes('user rejected') || msg.includes('User denied') || msg.includes('ACTION_REJECTED')) {
            toast({
              title: "Transaction Cancelled",
              description: `MetaMask transaction rejected. ${successCount} ticket(s) minted before cancellation.`,
              variant: "destructive"
            });
            break;
          }
        }
      }

      if (successCount === 0 && errorMessages.length > 0) {
        throw new Error(`Failed to mint tickets. ${errorMessages[0]}`);
      }

      if (successCount > 0) {
        const message = successCount === emailList.length
          ? `Successfully minted ${emailList.length} NFT ticket(s) on the blockchain!`
          : `Minted ${successCount} of ${emailList.length} tickets. ${errorMessages.length} failed.`;

        toast({
          title: successCount === emailList.length ? "All Tickets Minted on Blockchain! 🎉" : "Partially Completed",
          description: message,
          variant: successCount === emailList.length ? "default" : "destructive"
        });
      }

      // Immediately refresh stats after minting
      fetchOrgStats();

      // Reset form
      setTicketForm({ eventId: '', emails: '' });
      setMintedTicket(null);
      setMintedTicketId('');
    } catch (error: any) {
      console.error('Error generating tickets:', error);
      toast({
        title: "Minting Failed",
        description: error.message || "Blockchain transaction failed. Check MetaMask and try again.",
        variant: "destructive"
      });
    } finally {
      setSendingEmails(false);
    }
  };

  // Handle ticket verification
  const handleVerifyTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await verifyTicket(verifyForm.eventId, verifyForm.ticketId);

    if (result) {
      // Don't try to load event details to avoid the contract mismatch error
      setVerificationResult({
        ...result,
        event: undefined // Skip event details for now
      });
      // Refresh stats after verification
      fetchOrgStats();
    }
  };

  // Handle QR scan
  const handleQRScan = (data: string) => {
    try {
      // Parse QR code data
      // Format: "event:12345" or "event:12345:ticket:67890:wallet:0x789ABC"
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
      }
      setIsQRScannerOpen(false);
      toast({
        title: "QR Code Scanned",
        description: "Data has been filled in the form."
      });
    } catch (error) {
      toast({
        title: "Invalid QR Code",
        description: "Could not parse QR code data.",
        variant: "destructive"
      });
    }
  };

  // Load event details when eventId changes for ticket form
  useEffect(() => {
    if (ticketForm.eventId && ticketForm.eventId !== eventForTicket?.id) {
      // Try to get event from blockchain, but don't show error if it fails
      // (Event might only exist in Supabase, not on blockchain yet)
      getEvent(ticketForm.eventId).then(event => {
        if (event) {
          setEventForTicket(event);
        }
      }).catch(err => {
        // Silently ignore - event might be newly created and only in Supabase
        console.log('Event not found on blockchain yet:', err.message);
      });
    }
  }, [ticketForm.eventId]);

  // Generate QR code data
  const getEventQRData = (eventId: string) => `event:${eventId}`;
  const getTicketQRData = (eventId: string, ticketId: string, walletAddress: string) =>
    `event:${eventId}:ticket:${ticketId}:wallet:${walletAddress}`;

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => setLocation('/')}>
                <Box className="text-primary text-2xl group-hover:scale-110 transition-transform" />
                <h1 className="text-xl font-semibold font-bitcount tracking-normal">
                  <span className="text-white">Block</span>
                  <span className="text-primary">Tix</span>
                </h1>
              </div>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary-foreground/70">
                Sepolia Testnet
              </Badge>
              {user && (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <UserIcon className="h-3 w-3 mr-1" />
                  {user.user_metadata?.name || user.email}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <WalletConnect />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 font-medium"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-4rem)] bg-card/50 backdrop-blur-lg border-r border-border/50 sticky top-16 self-start">
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Navigation</p>
            
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 h-11 text-sm font-medium transition-all',
                activeSidebarSection === 'tabs'
                  ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
              onClick={() => setActiveSidebarSection('tabs')}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 text-sm font-medium bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/20 hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-indigo-300 transition-all"
              onClick={() => setLocation('/dashboard')}
            >
              <BarChart3 className="h-4 w-4" />
              View Dashboard
            </Button>

            <div className="border-t border-border/30 my-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Account</p>

            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 h-11 text-sm font-medium transition-all',
                activeSidebarSection === 'settings'
                  ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
              onClick={() => {
                setActiveSidebarSection('settings');
                setProfileDialogOpen(true);
              }}
            >
              <Settings className="h-4 w-4" />
              User Settings
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Live Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card/40 border-border hover:border-primary/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Events</span>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-white">{orgStats.totalEvents}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Total created</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40 border-border hover:border-green-500/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tickets</span>
                <TicketIcon className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{orgStats.totalTicketsMinted}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{orgStats.ticketsUsed} used · {orgStats.ticketsApproved} approved</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40 border-border hover:border-amber-500/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</span>
                <Box className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{orgStats.totalRevenue.toFixed(4)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">ETH earned</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40 border-border hover:border-blue-500/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Requests</span>
                <UserIcon className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{enrollmentRequests.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{enrollmentRequests.filter(r => r.status === 'pending').length} pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-8 bg-card/50 backdrop-blur-lg border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-transparent p-0">
              <TabsTrigger
                value="create"
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
                data-testid="tab-create-event"
              >
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </TabsTrigger>
              <TabsTrigger
                value="generate"
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
                data-testid="tab-generate-ticket"
              >
                <TicketIcon className="w-4 h-4" />
                <span>Generate Ticket</span>
              </TabsTrigger>
              <TabsTrigger
                value="verify"
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
                data-testid="tab-verify-ticket"
              >
                <Shield className="w-4 h-4" />
                <span>Verify Ticket</span>
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
              >
                <UserIcon className="w-4 h-4" />
                <span>Requests</span>
                {enrollmentRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white px-2 py-0.5 text-xs">
                    {enrollmentRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="support"
                className="flex items-center space-x-2 py-4 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500 data-[state=active]:border-b-2 data-[state=active]:border-green-500 transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Support</span>
                <Badge className="ml-2 bg-green-500 text-white px-2 py-0.5 text-xs animate-pulse">
                  Live
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Create Event Tab */}
            <TabsContent value="create" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* Create Event Form */}
                <Card className="bg-card/30 border-border overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>Create New Event</span>
                    </CardTitle>
                    <p className="text-muted-foreground">Deploy your event to the blockchain ...</p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* Contract status notice */}
                    {contractAddress === "0x0000000000000000000000000000000000000000" ? (
                      <Alert className="mb-4 bg-orange-500/10 border-orange-500/20 text-orange-400">
                        <Info className="w-4 h-4" />
                        <AlertDescription>
                          <strong className="text-white">Smart Contract Required:</strong> To use this app, deploy the contract from <code>contracts/EventTicketing.sol</code> to Sepolia testnet using{' '}
                          <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                            Remix IDE
                          </a>, then set <code>VITE_CONTRACT_ADDRESS</code> in your environment.{' '}
                          <a href="/DEPLOYMENT.md" className="underline text-primary">View full guide</a>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="mb-4 bg-primary/10 border-primary/20 text-primary">
                        <CheckCircle className="w-4 h-4" />
                        <AlertDescription>
                          <strong className="text-white">Contract Connected:</strong> Smart contract deployed at{' '}
                          <code className="bg-primary/20 px-1 rounded text-xs text-primary">{contractAddress}</code> on Sepolia testnet.
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

                      <div className="relative">
                        <Label htmlFor="eventLocation">Location</Label>
                        <Input
                          id="eventLocation"
                          value={eventForm.location}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          onFocus={() => eventForm.location.length > 2 && setShowLocationSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                          placeholder="Enter venue or location"
                          required
                          data-testid="input-event-location"
                          className="w-full"
                        />
                        {showLocationSuggestions && locationSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                            {locationSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="px-4 py-2 hover:bg-primary/10 cursor-pointer text-sm text-foreground transition-colors"
                                onMouseDown={() => {
                                  setEventForm(prev => ({ ...prev, location: suggestion }));
                                  setShowLocationSuggestions(false);
                                }}
                              >
                                <MapPin className="w-3 h-3 inline-block mr-2 text-primary" />
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="eventDate">Event Date & Time</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !eventForm.date && "text-muted-foreground"
                              )}
                              data-testid="input-event-date"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {eventForm.date ? format(eventForm.date, "PPP 'at' p") : <span>Pick a date and time</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={eventForm.date}
                              onSelect={(date) => setEventForm(prev => ({ ...prev, date }))}
                              initialFocus
                            />
                            {eventForm.date && (
                              <div className="p-3 border-t">
                                <Label className="text-xs mb-2 block">Time</Label>
                                <Input
                                  type="time"
                                  value={eventForm.date ? format(eventForm.date, 'HH:mm') : ''}
                                  onChange={(e) => {
                                    if (eventForm.date && e.target.value) {
                                      const [hours, minutes] = e.target.value.split(':');
                                      const newDate = new Date(eventForm.date);
                                      newDate.setHours(parseInt(hours), parseInt(minutes));
                                      setEventForm(prev => ({ ...prev, date: newDate }));
                                    }
                                  }}
                                  className="w-full"
                                />
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
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

                      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                        <div className="space-y-0.5">
                          <Label htmlFor="event-visibility" className="text-base font-semibold">
                            Event Visibility
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {eventForm.isPublic ? 'Public - Visible to all users' : 'Private - Hidden from public listing'}
                          </p>
                        </div>
                        <Switch
                          id="event-visibility"
                          checked={eventForm.isPublic}
                          onCheckedChange={(checked) => setEventForm(prev => ({ ...prev, isPublic: checked }))}
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

                {/* Instruction Manual for Create Event */}
                {!createdEvent && (
                  <Card className="bg-card/30 border-border">
                    <CardContent className="pt-6">
                      <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong className="text-white">How to Create an Event:</strong><br/>
                          1. Fill in all event details (name, description, location)<br/>
                          2. Select the event date and time<br/>
                          3. Set ticket price in ETH and maximum ticket capacity<br/>
                          4. Choose event visibility (Public/Private)<br/>
                          5. Click "Deploy Event to Blockchain" and confirm the MetaMask transaction<br/>
                          6. Your event ID will be auto-filled in the Generate Ticket tab
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}

                {/* Event Created Success */}
                {createdEvent && (
                  <div className="space-y-6">
                    <Card className="bg-card/40 border-primary/30 shadow-glow shadow-primary/10">
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                          <CheckCircle className="text-primary text-2xl" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2 font-bitcount tracking-normal">Event Created Successfully!</h3>
                        <p className="text-muted-foreground mb-6">Your event has been deployed to the Sepolia blockchain</p>

                        {/* Event Details Card */}
                        <div className="bg-background/80 rounded-lg p-4 mb-6 text-left border border-border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Event ID:</span>
                              <p className="font-mono font-medium text-primary" data-testid="text-created-event-id">
                                {createdEventId}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Price:</span>
                              <p className="font-medium text-white" data-testid="text-created-event-price">
                                {createdEvent.ticketPrice} ETH
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Tickets:</span>
                              <p className="font-medium text-white" data-testid="text-created-event-max-tickets">
                                {createdEvent.maxTickets}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Available:</span>
                              <p className="font-medium text-primary" data-testid="text-created-event-available">
                                {createdEvent.maxTickets - createdEvent.ticketsSold}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Alert className="bg-green-500/10 border-green-500/20 text-green-400 mt-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Event ID <strong className="text-white">{createdEventId}</strong> has been auto-filled in the Generate Ticket tab. Switch to that tab to generate tickets for users.
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Generate Ticket Tab */}
            <TabsContent value="generate" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* Generate Ticket Form */}
                <Card className="bg-card/30 border-border overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <TicketIcon className="w-5 h-5 text-primary" />
                      <span>Generate Tickets for Users</span>
                    </CardTitle>
                    <p className="text-muted-foreground">Generate tickets and send them to users via email (supports bulk)</p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleMintTicket} className="space-y-4">
                      <div>
                        <Label htmlFor="eventId">Event ID</Label>
                        <Input
                          id="eventId"
                          value={ticketForm.eventId}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, eventId: e.target.value }))}
                          placeholder="Auto-filled from created event"
                          required
                          data-testid="input-event-id"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="emails">User Emails (one per line or comma-separated for bulk)</Label>
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/30 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {uploadingFile ? 'Loading...' : 'Upload CSV/Excel'}
                            </div>
                            <input
                              id="file-upload"
                              type="file"
                              accept=".csv,.txt,.xlsx,.xls"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={uploadingFile}
                            />
                          </label>
                        </div>
                        <Textarea
                          id="emails"
                          value={ticketForm.emails}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, emails: e.target.value }))}
                          placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com&#10;&#10;Or click 'Upload CSV/Excel' to import from file"
                          rows={8}
                          required
                          data-testid="input-emails"
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">💡 Separate emails with commas or new lines. Each user will receive a unique QR code. You can also upload a CSV/Excel file.</p>
                      </div>

                      {/* Info about blockchain minting */}
                      <Alert className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong className="text-white">⛓️ Blockchain NFT Minting:</strong> Each ticket is minted as an NFT on the Sepolia blockchain. A <strong>privacy hash</strong> of the email is stored on-chain (not the actual email). You'll need to confirm each transaction in MetaMask. Uses <strong>test ETH</strong> (free from faucets) — no real money required.
                        </AlertDescription>
                      </Alert>

                      {/* Event Info Display */}
                      {eventForTicket && (
                        <Card className="bg-background/80 border-border overflow-hidden">
                          <CardHeader className="py-3 px-4 bg-primary/5 border-b border-border">
                            <CardTitle className="text-sm font-bold text-white">Event Details</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm p-4">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Event Name:</span>
                              <span className="font-medium text-white" data-testid="text-event-name">
                                {eventForTicket.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Date:</span>
                              <span className="font-medium text-white" data-testid="text-event-date">
                                {new Date(eventForTicket.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Price:</span>
                              <span className="font-medium text-primary" data-testid="text-event-price">
                                {eventForTicket.ticketPrice} ETH
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Available:</span>
                              <span className="font-medium text-primary" data-testid="text-event-available">
                                {eventForTicket.maxTickets - eventForTicket.ticketsSold}/{eventForTicket.maxTickets}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {!walletState.isConnected && (
                        <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong className="text-white">Wallet Required:</strong> Connect your MetaMask wallet to the Sepolia testnet to mint NFT tickets on the blockchain.
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        disabled={sendingEmails || !walletState.isConnected || !walletState.isCorrectChain}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-lg"
                        data-testid="button-mint-ticket"
                      >
                        {sendingEmails ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <TicketIcon className="w-4 h-4 mr-2" />}
                        {sendingEmails ? 'Minting on Blockchain...' : 'Mint NFT Tickets on Blockchain'}
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

                {/* Info Card */}
                <Card className="bg-card/30 border-border">
                  <CardContent className="pt-6">
                    <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong className="text-white">How Blockchain Minting Works:</strong><br/>
                        1. Enter the event ID (auto-filled when you create an event)<br/>
                        2. Enter user email addresses (one per line or comma-separated)<br/>
                        3. Click "Mint NFT Tickets on Blockchain"<br/>
                        4. Confirm each MetaMask transaction (each ticket = 1 NFT on-chain)<br/>
                        5. Each user gets a QR code that verifies their ticket directly on the Ethereum blockchain
                      </AlertDescription>
                    </Alert>
                    
                    {eventForTicket && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          Event Information
                        </h4>
                        <div className="bg-background/80 rounded-lg p-4 border border-border space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event Name:</span>
                            <span className="font-medium text-white">{eventForTicket.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium text-white">{new Date(eventForTicket.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium text-primary">{eventForTicket.ticketPrice} ETH</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Verify Ticket Tab */}
            <TabsContent value="verify" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* Verify Ticket Form */}
                <Card className="bg-card/30 border-border overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Shield className="w-5 h-5 text-primary" />
                      <span>Verify Event Ticket</span>
                    </CardTitle>
                    <p className="text-muted-foreground">Scan or enter ticket details to verify authenticity on the blockchain</p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* QR Scanner Section */}
                    <div className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center mb-6 bg-muted/20 group hover:border-primary/50 transition-colors">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-bold text-white mb-2">Scan QR Code</h4>
                      <p className="text-muted-foreground text-sm mb-4">Point your camera at the ticket QR code</p>
                      <Button
                        onClick={() => {
                          setQrScanType('verify');
                          setIsQRScannerOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white shadow-glow shadow-primary/20"
                        data-testid="button-start-qr-scan"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>

                    <div className="flex items-center mb-6">
                      <div className="flex-1 border-t border-border/50"></div>
                      <span className="px-4 text-muted-foreground text-xs font-bold tracking-widest uppercase">OR</span>
                      <div className="flex-1 border-t border-border/50"></div>
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

                {/* Instruction Manual for Verify Ticket */}
                <Card className="bg-card/30 border-border">
                  <CardContent className="pt-6">
                    <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong className="text-white">How to Verify Tickets:</strong><br/>
                        1. <strong>Camera Method:</strong> Click "Start Camera" and scan the QR code on the ticket<br/>
                        2. <strong>Manual Method:</strong> Enter Event ID and Ticket ID from the issued ticket<br/>
                        3. Click "Verify on Blockchain" to check authenticity<br/>
                        4. If valid, you can mark the ticket as used to prevent re-entry<br/>
                        5. All verification is done on the Ethereum blockchain for maximum security
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Verification Results */}
                {verificationResult && (
                  <div className="space-y-6">
                    <Card className={`bg-card/40 border-${verificationResult.valid ? 'primary' : 'destructive'}/30 shadow-glow shadow-${verificationResult.valid ? 'primary' : 'destructive'}/10 overflow-hidden`}>
                      <CardContent className="pt-6 text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${verificationResult.valid
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-destructive/10 border-destructive/20 text-destructive'
                          }`}>
                          {verificationResult.valid ? (
                            <CheckCircle className="w-10 h-10" />
                          ) : (
                            <XCircle className="w-10 h-10" />
                          )}
                        </div>

                        <h3 className={`text-2xl font-semibold mb-2 font-bitcount tracking-normal ${verificationResult.valid ? 'text-primary' : 'text-destructive'
                          }`}>
                          {verificationResult.valid ? 'Valid Ticket Detected' : 'Invalid Ticket Detected'}
                        </h3>

                        <p className="text-muted-foreground mb-6">
                          {verificationResult.valid
                            ? 'This ticket has been verified on the blockchain'
                            : 'This ticket could not be verified on the blockchain'
                          }
                        </p>

                        {verificationResult.valid ? (
                          <>
                            {/* Valid Ticket Details */}
                            <div className="bg-background/80 rounded-xl p-6 mb-6 text-left border border-border">
                              <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Ticket ID</span>
                                  <span className="font-mono font-medium text-primary bg-primary/5 px-2 py-1 rounded" data-testid="text-verified-ticket-id">
                                    {verifyForm.ticketId}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Owner Address</span>
                                  <span className="font-mono font-medium text-white" data-testid="text-verified-ticket-owner">
                                    {verificationResult.owner.slice(0, 6)}...{verificationResult.owner.slice(-4)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Attendee Name</span>
                                  <span className="font-bold text-white text-sm break-all max-w-[200px] text-right" data-testid="text-verified-attendee-name">
                                    {verificationResult.attendeeName.length > 30 
                                      ? `${verificationResult.attendeeName.slice(0, 15)}...${verificationResult.attendeeName.slice(-10)}`
                                      : verificationResult.attendeeName}
                                  </span>
                                </div>
                                {verificationResult.event && (
                                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                    <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Event</span>
                                    <span className="font-medium text-white" data-testid="text-verified-event-name">
                                      {verificationResult.event.name}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Usage Status</span>
                                  <Badge
                                    className={`px-3 py-1 rounded-full border ${verificationResult.isUsed
                                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                                      : 'bg-primary/10 text-primary border-primary/20'
                                      }`}
                                    data-testid="status-verified-ticket"
                                  >
                                    {verificationResult.isUsed ? (
                                      <>
                                        <AlertTriangle className="w-3 h-3 mr-1.5" />
                                        Used
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1.5" />
                                        Valid / Not Used
                                      </>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex space-x-3">
                              {!verificationResult.isUsed && (
                                <Button
                                  onClick={async () => {
                                    try {
                                      const result = await markTicketUsed(verifyForm.eventId, verifyForm.ticketId);
                                      if (result) {
                                        // Update Supabase database to reflect used status
                                        const { error: updateError } = await supabase
                                          .from('ticket_emails')
                                          .update({ status: 'used' })
                                          .eq('event_id', verifyForm.eventId)
                                          .eq('ticket_id', verifyForm.ticketId);
                                        
                                        if (updateError) {
                                          console.error('Failed to update ticket status in database:', updateError);
                                        }
                                        
                                        toast({
                                          title: "Ticket Marked as Used ✓",
                                          description: "This ticket has been marked as used and cannot be used again for entry.",
                                        });
                                        await handleVerifyTicket(new Event('submit') as any);
                                      }
                                    } catch (error: any) {
                                      toast({
                                        title: "Failed to Mark Ticket",
                                        description: error.message,
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                  className="flex-1 bg-green-600 hover:bg-green-700 font-bold"
                                  data-testid="button-mark-ticket-used"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Used
                                </Button>
                              )}
                              <Button
                                onClick={() => {
                                  const badge = document.createElement('div');
                                  badge.innerHTML = `
                                    <div style="font-family: Arial; padding: 40px; text-align: center; border: 2px solid #000;">
                                      <h1>EVENT PASS</h1>
                                      <p><strong>Ticket ID:</strong> ${verifyForm.ticketId}</p>
                                      <p><strong>Event ID:</strong> ${verifyForm.eventId}</p>
                                      <p><strong>Attendee:</strong> ${verificationResult?.attendeeName || 'N/A'}</p>
                                      <p><strong>Owner:</strong> ${verificationResult?.owner || 'N/A'}</p>
                                      <p>✓ Verified on Blockchain</p>
                                    </div>
                                  `;
                                  const printWindow = window.open('', '_blank');
                                  if (printWindow) {
                                    printWindow.document.write(badge.innerHTML);
                                    printWindow.document.close();
                                    printWindow.print();
                                  }
                                }}
                                variant="outline"
                                className="flex-1 border-primary/30 hover:bg-primary/10"
                                data-testid="button-print-badge"
                              >
                                Print Badge
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Invalid Ticket Warning */}
                            <Alert className="bg-destructive/10 border-destructive/20 mb-6 text-destructive">
                              <AlertTriangle className="h-5 w-5" />
                              <AlertDescription className="text-left">
                                <p className="font-bold text-sm mb-2 uppercase tracking-wider">Possible Issues</p>
                                <ul className="text-xs space-y-1.5 opacity-90">
                                  <li className="flex items-center gap-2">
                                    <XCircle className="w-3 h-3" />
                                    Ticket ID does not exist on blockchain
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <XCircle className="w-3 h-3" />
                                    Ticket has already been used
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <XCircle className="w-3 h-3" />
                                    Wallet address mismatch
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <XCircle className="w-3 h-3" />
                                    Fraudulent or counterfeit ticket
                                  </li>
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

            {/* Enrollment Requests Tab */}
            <TabsContent value="requests" className="mt-0">
              <Tabs defaultValue="event-requests" className="w-full">
                <div className="border-b border-border px-6 pt-4">
                  <TabsList className="bg-muted/30 border border-border p-1 gap-1">
                    <TabsTrigger
                      value="event-requests"
                      className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      Event Requests ({enrollmentRequests.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="ad-requests"
                      className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Ad Requests ({adRequests.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Event Requests Sub-Tab */}
                <TabsContent value="event-requests" className="mt-0">
              <div className="grid lg:grid-cols-3 gap-6 p-6">
                {/* Left Column - Instructions */}
                <div className="lg:col-span-1">
                  <Card className="bg-card/30 border-border sticky top-24">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                      <CardTitle className="flex items-center space-x-2 text-white">
                        <Info className="w-5 h-5 text-primary" />
                        <span>How It Works</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                        <AlertDescription>
                          <strong className="text-white">Managing Enrollment Requests:</strong><br/>
                          1. Users request enrollment from the User Dashboard<br/>
                          2. Requests appear here for your review<br/>
                          3. Click <strong>"Approve & Mint Ticket"</strong> to create an NFT ticket on blockchain<br/>
                          4. Confirm the MetaMask transaction (uses test ETH)<br/>
                          5. User receives the ticket via email with a QR code<br/>
                          6. Or click <strong>"Decline"</strong> to reject the request
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Requests List */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Enrollment Requests</h2>
                    <p className="text-muted-foreground">Review and manage user enrollment requests for your events</p>
                  </div>

                {enrollmentRequests.length === 0 ? (
                  <Card className="bg-card/30 border-border border-dashed">
                    <CardContent className="p-12 text-center">
                      <UserIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg font-medium">No enrollment requests yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {enrollmentRequests.map((request) => (
                      <Card key={request.id} className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-bold text-white">{request.event_name}</h3>
                                <Badge className={`
                                  ${request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''}
                                  ${request.status === 'approved' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}
                                  ${request.status === 'declined' ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}
                                  px-3 py-1 font-bold uppercase text-xs
                                `}>
                                  {request.status}
                                </Badge>
                                {/* Priority indicator for paid events */}
                                {request.event_id && request.event_id >= 9990 && request.event_id <= 9999 && (
                                  (() => {
                                    const demoPrices: Record<number, string> = {
                                      9999: '0.05', 9998: '0.03', 9997: '0.08', 9996: '0.06',
                                      9995: '0.0', 9994: '0.02', 9993: '0.0', 9992: '0.04',
                                      9991: '0.0', 9990: '0.1'
                                    };
                                    const isPaid = parseFloat(demoPrices[request.event_id] || '0') > 0;
                                    return isPaid ? (
                                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-3 py-1 font-bold text-xs">
                                        👑 PAID - Priority
                                      </Badge>
                                    ) : null;
                                  })()
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div>
                                  <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Requester Name</span>
                                  <span className="text-white font-medium">{request.requester_name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Email</span>
                                  <span className="text-white font-medium">{request.requester_email}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Event ID</span>
                                  <span className="text-primary font-mono">{request.event_id}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Requested</span>
                                  <span className="text-white">{new Date(request.requested_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            {request.status === 'pending' && (
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleApproveRequest(request)}
                                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleDeclineRequest(request)}
                                  variant="destructive"
                                  className="font-bold"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}  
                </div>
              </div>
            </TabsContent>

            {/* Ad Requests Sub-Tab */}
            <TabsContent value="ad-requests" className="mt-0">
              <div className="grid lg:grid-cols-3 gap-6 p-6">
                {/* Left Column - Instructions */}
                <div className="lg:col-span-1">
                  <Card className="bg-card/30 border-border sticky top-24">
                    <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent border-b border-border/50">
                      <CardTitle className="flex items-center space-x-2 text-white">
                        <Info className="w-5 h-5 text-amber-400" />
                        <span>Ad Requests Info</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-400">
                        <AlertDescription>
                          <strong className="text-white">Managing Ad Requests:</strong><br/>
                          1. Users submit ad requests via the "Your Ad Here" feature<br/>
                          2. Review the ad type and description<br/>
                          3. Contact the requester to discuss pricing and timeline<br/>
                          4. Accept or decline based on your advertising policies<br/>
                          <br/>
                          <strong className="text-amber-300">Ad Types:</strong><br/>
                          • Banner Ads (Dashboard display)<br/>
                          • Featured Event Listings<br/>
                          • Email Promotions<br/>
                          • Social Media Shoutouts
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Ad Requests List */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Advertising Requests</h2>
                    <p className="text-muted-foreground">Review and manage advertising requests from potential sponsors</p>
                  </div>

                  {adRequests.length === 0 ? (
                    <Card className="bg-card/30 border-border border-dashed">
                      <CardContent className="p-12 text-center">
                        <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg font-medium">No ad requests yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {adRequests.map((adRequest) => (
                        <Card key={adRequest.id} className="bg-gradient-to-r from-amber-500/5 to-transparent backdrop-blur-sm border-amber-500/20 hover:border-amber-500/40 transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-bold text-white">{adRequest.business_name}</h3>
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-3 py-1 font-bold uppercase text-xs">
                                    {adRequest.ad_type}
                                  </Badge>
                                  <Badge className={`
                                    ${adRequest.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''}
                                    ${adRequest.status === 'accepted' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}
                                    ${adRequest.status === 'declined' ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}
                                    px-3 py-1 font-bold uppercase text-xs
                                  `}>
                                    {adRequest.status}
                                  </Badge>
                                </div>
                                
                                {adRequest.image_url && (
                                  <div className="mb-4 rounded-lg overflow-hidden border border-amber-500/20">
                                    <img 
                                      src={adRequest.image_url} 
                                      alt={adRequest.business_name}
                                      className="w-full max-h-64 object-cover"
                                    />
                                  </div>
                                )}
                                
                                <div className="space-y-3 mb-4">
                                  <div>
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Description</span>
                                    <p className="text-white text-sm">{adRequest.description}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Contact Email</span>
                                      <span className="text-white font-medium text-sm">{adRequest.contact_email}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Requested</span>
                                      <span className="text-white text-sm">{new Date(adRequest.requested_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {adRequest.status === 'pending' && (
                                <div className="flex gap-3">
                                  <Button
                                    onClick={() => {
                                      // Update the ad request status
                                      const updatedRequests = adRequests.map(r => 
                                        r.id === adRequest.id ? { ...r, status: 'accepted' } : r
                                      );
                                      setAdRequests(updatedRequests);
                                      
                                      // Save updated requests back to localStorage
                                      try {
                                        localStorage.setItem('adRequests', JSON.stringify(updatedRequests));
                                      } catch (error) {
                                        console.error('Error updating ad requests:', error);
                                      }
                                      
                                      // Save approved ad to localStorage
                                      try {
                                        const existingAds = JSON.parse(localStorage.getItem('approvedAds') || '[]');
                                        const newAd = {
                                          id: adRequest.id,
                                          business_name: adRequest.business_name,
                                          ad_type: adRequest.ad_type,
                                          description: adRequest.description,
                                          contact_email: adRequest.contact_email,
                                          image_url: adRequest.image_url,
                                          approved_at: new Date().toISOString()
                                        };
                                        existingAds.push(newAd);
                                        localStorage.setItem('approvedAds', JSON.stringify(existingAds));
                                        
                                        alert(`Ad request accepted! This ad will now appear on user dashboards. Contact ${adRequest.contact_email} to discuss pricing.`);
                                      } catch (error) {
                                        console.error('Error saving approved ad:', error);
                                        alert(`Ad request accepted! Contact ${adRequest.contact_email} to discuss pricing.`);
                                      }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Accept
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      const updatedRequests = adRequests.map(r => 
                                        r.id === adRequest.id ? { ...r, status: 'declined' } : r
                                      );
                                      setAdRequests(updatedRequests);
                                      
                                      // Save updated requests back to localStorage
                                      try {
                                        localStorage.setItem('adRequests', JSON.stringify(updatedRequests));
                                      } catch (error) {
                                        console.error('Error updating ad requests:', error);
                                      }
                                    }}
                                    variant="destructive"
                                    className="font-bold"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Support Team Tab */}
            <TabsContent value="support" className="mt-0">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <MessageCircle className="h-6 w-6 text-green-500" />
                    Support Chat Center
                  </h2>
                  <p className="text-muted-foreground">Manage support requests from users in real-time</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Chat Inbox */}
                  <div className="lg:col-span-1">
                    <Card className="bg-card/30 border-border">
                      <CardHeader className="bg-green-500/5 border-b border-border/50">
                        <CardTitle className="text-white flex items-center gap-2">
                          <UserIcon className="h-5 w-5 text-green-500" />
                          Active Chats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="text-center py-12">
                          <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="text-muted-foreground text-sm">No active chat requests yet</p>
                          <p className="text-xs text-muted-foreground mt-2">User chats will appear here when they contact you</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Chat Window */}
                  <div className="lg:col-span-2">
                    <Card className="bg-card/30 border-border h-[600px] flex flex-col">
                      <CardHeader className="bg-green-500/5 border-b border-border/50">
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-green-500" />
                            <span>Support Chat</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex items-center justify-center p-4">
                        <div className="text-center">
                          <MessageCircle className="h-20 w-20 text-muted-foreground/20 mx-auto mb-4" />
                          <p className="text-xl font-semibold text-white mb-2">No conversation selected</p>
                          <p className="text-muted-foreground">Select a chat from the left to start responding</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-4 mt-6">
                  <Card className="bg-green-500/5 border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-white">{orgStats.totalEvents}</p>
                      <p className="text-xs text-muted-foreground uppercase">Total Events</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-white">{orgStats.totalTicketsMinted}</p>
                      <p className="text-xs text-muted-foreground uppercase">Tickets Minted</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-white">{orgStats.ticketsUsed}</p>
                      <p className="text-xs text-muted-foreground uppercase">Tickets Used</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-white">{orgStats.totalRevenue.toFixed(4)} ETH</p>
                      <p className="text-xs text-muted-foreground uppercase">Total Revenue</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onScan={handleQRScan}
        onClose={() => setIsQRScannerOpen(false)}
      />

      {/* Profile Settings Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b border-border/30 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-full border border-primary/30">
                  <UserIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">Organizer Profile</DialogTitle>
                  <p className="text-sm text-muted-foreground">Manage your account settings</p>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditingProfile ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setTempProfileForm(profileForm);
                      }}
                      className="text-muted-foreground hover:text-white"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.auth.updateUser({
                            data: { 
                              name: tempProfileForm.username,
                              organization: tempProfileForm.organization
                            }
                          });
                          
                          if (error) throw error;
                          
                          setProfileForm(tempProfileForm);
                          setIsEditingProfile(false);
                          toast({
                            title: "Profile Updated! ✓",
                            description: "Your profile has been updated successfully."
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message,
                            variant: "destructive"
                          });
                        }
                      }}
                      className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-600"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-8 py-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">Name</Label>
                  <Input
                    id="username"
                    value={isEditingProfile ? tempProfileForm.username : profileForm.username}
                    onChange={(e) => isEditingProfile && setTempProfileForm({ ...tempProfileForm, username: e.target.value })}
                    disabled={!isEditingProfile}
                    className={!isEditingProfile ? 'opacity-75 cursor-not-allowed' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="opacity-75 cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-sm font-medium">Organization</Label>
                <Input
                  id="organization"
                  value={isEditingProfile ? tempProfileForm.organization : profileForm.organization}
                  onChange={(e) => isEditingProfile && setTempProfileForm({ ...tempProfileForm, organization: e.target.value })}
                  disabled={!isEditingProfile}
                  placeholder="Your organization name"
                  className={!isEditingProfile ? 'opacity-75 cursor-not-allowed' : ''}
                />
              </div>
            </div>

            {/* Wallet Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Wallet Information
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="wallet" className="text-sm font-medium">Connected Wallet</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="wallet"
                    value={walletState.address || 'Not connected'}
                    disabled
                    className="opacity-75 cursor-not-allowed font-mono text-sm"
                  />
                  {walletState.address && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                      Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
