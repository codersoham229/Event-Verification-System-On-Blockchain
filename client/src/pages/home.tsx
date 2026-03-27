import { useState, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WalletConnect } from '@/components/wallet-connect';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { QRScanner } from '@/components/qr-scanner';
import { TransactionStatus } from '@/components/transaction-status';
import { PhotoViewer } from '@/components/photo-viewer';

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
  LayoutDashboard,
  Star,
  Upload,
  Mail
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

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
    isPublic: true,
    eventType: '',
    inviteEmails: ''
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
  const [badgeSent, setBadgeSent] = useState(false);

  // QR Scanner state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrScanType, setQrScanType] = useState<'event' | 'verify'>('event');

  const [activeTab, setActiveTab] = useState('create');
  const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
  const [adRequests, setAdRequests] = useState<any[]>([]);
  const [activeSidebarSection, setActiveSidebarSection] = useState('tabs');

  // Photo viewer state for enrollment requests
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerData, setPhotoViewerData] = useState<{
    photoPath: string | null;
    encryptionKey: string | null;
    encryptionIv: string | null;
    requesterName: string;
  }>({ photoPath: null, encryptionKey: null, encryptionIv: null, requesterName: '' });

  // Organizer Chat Inbox
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<{ event_id: number; sender_email: string; event_name: string; sender_name: string } | null>(null);
  const selectedConversationRef = useRef(selectedConversation);
  useEffect(() => { selectedConversationRef.current = selectedConversation; }, [selectedConversation]);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [orgReplyMessage, setOrgReplyMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
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

  // Volunteer management — emails that can verify tickets for a given event
  const [volunteers, setVolunteers] = useState<string[]>([]);
  const [volunteerInput, setVolunteerInput] = useState('');

  const loadVolunteers = (eventId: string) => {
    try {
      const stored = localStorage.getItem(`volunteers_${eventId}`);
      setVolunteers(stored ? JSON.parse(stored) : []);
    } catch { setVolunteers([]); }
  };

  const saveVolunteers = (eventId: string, list: string[]) => {
    localStorage.setItem(`volunteers_${eventId}`, JSON.stringify(list));
    setVolunteers(list);
  };

  const addVolunteer = () => {
    const email = volunteerInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (!verifyForm.eventId) {
      toast({ title: 'Enter Event ID first', description: 'Type the event ID above before adding volunteers.', variant: 'destructive' });
      return;
    }
    const updated = volunteers.includes(email) ? volunteers : [...volunteers, email];
    saveVolunteers(verifyForm.eventId, updated);
    setVolunteerInput('');
    toast({ title: 'Volunteer added ✅', description: `${email} can now verify tickets for event ${verifyForm.eventId}.` });
  };

  const removeVolunteer = (email: string) => {
    const updated = volunteers.filter(v => v !== email);
    saveVolunteers(verifyForm.eventId, updated);
  };

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

  // Fetch enrollment requests and chat conversations
  useEffect(() => {
    if (walletState.address) {
      fetchEnrollmentRequests();
      fetchChatConversations();
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

      // Fetch pending enrollments directly to avoid stale state
      const { data: enrollData } = await supabase
        .from('enrollment_requests')
        .select('id')
        .eq('status', 'pending');

      setOrgStats({
        totalEvents: allEvents.length,
        totalTicketsMinted: allTickets.length,
        ticketsUsed: allTickets.filter((t: any) => t.status === 'used').length,
        ticketsApproved: allTickets.filter((t: any) => t.status === 'approved').length,
        totalRevenue,
        pendingEnrollments: (enrollData || []).length,
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

    const chatChannel = supabase
      .channel('org-chat-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        fetchChatConversations();
        // If viewing the same conversation, append the new message
        const conv = selectedConversationRef.current;
        if (conv && payload.new) {
          const msg = payload.new as any;
          if (msg.event_id === conv.event_id && msg.sender_email === conv.sender_email) {
            setConversationMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      })
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
      ticketsChannel.unsubscribe();
      enrollChannel.unsubscribe();
      chatChannel.unsubscribe();
    };
  }, []);

  const fetchEnrollmentRequests = async () => {
    try {
      // Fetch requests for events created by this organizer's wallet
      // OR for demo events (to allow testing)
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select('*')
        .or(`organizer_address.eq.${walletState.address},organizer_address.eq.0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0`)
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
      let eventInfo: any = null;

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
          .select('price, name, description, date, location, event_type')
          .eq('id', request.event_id)
          .single();

        if (eventError || !eventData) {
          throw new Error("Could not fetch event details");
        }

        ticketPrice = eventData.price;
        // Reuse already-fetched event data for ticket enrichment
        eventInfo = eventData;
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

      // Build QR as a real URL so phone cameras open it directly in the browser.
      // window.location.origin auto-adapts: localhost during dev, real domain when deployed,
      // or local IP (e.g. 192.168.x.x:5000) when accessed via network IP.
      const approvalQrPayload = btoa(unescape(encodeURIComponent(JSON.stringify({
        n: eventInfo?.name || request.event_name || 'Event',
        d: eventInfo?.date || '',
        l: eventInfo?.location || '',
        e: request.requester_email,
        h: mintResult.transactionHash,
      }))));
      const verifyUrl = `${window.location.origin}/verify-ticket?eventId=${request.event_id}&ticketId=${mintResult.ticketId}&d=${encodeURIComponent(approvalQrPayload)}`;

      // Create ticket for the user in Supabase with full event details + photo
      const { error: ticketError } = await supabase
        .from('ticket_emails')
        .insert({
          event_id: request.event_id,
          recipient_email: request.requester_email,
          ticket_id: mintResult.ticketId,
          unique_hash: mintResult.transactionHash,
          qr_data: verifyUrl,
          status: 'approved',
          event_name: eventInfo?.name || request.event_name || 'Event',
          event_date: eventInfo?.date || null,
          event_location: eventInfo?.location || null,
          event_description: eventInfo?.description || null,
          event_type: eventInfo?.event_type || request.event_type || null,
          attendee_name: request.requester_name || null,
          photo_path: request.photo_path || null,
          photo_encryption_key: request.photo_encryption_key || null,
          photo_encryption_iv: request.photo_encryption_iv || null,
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

  // ── Organizer Chat Inbox ──────────────────────────────────────────────
  const fetchChatConversations = async () => {
    if (!walletState.address) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('organizer_address', walletState.address)
        .order('created_at', { ascending: false });

      if (data) {
        // Group by event_id + sender_email to get unique conversations
        const convMap = new Map<string, any>();
        for (const msg of data) {
          const key = `${msg.event_id}::${msg.sender_email}`;
          if (!convMap.has(key) || msg.sender_role === 'user') {
            // Keep the latest user message as the conversation preview
            if (!convMap.has(key)) {
              convMap.set(key, {
                event_id: msg.event_id,
                event_name: msg.event_name,
                sender_email: msg.sender_email,
                sender_name: msg.sender_name,
                last_message: msg.message,
                last_time: msg.created_at,
                unread: msg.sender_role === 'user',
              });
            }
          }
        }
        setChatConversations(Array.from(convMap.values()));
      }
    } catch (err) {
      console.error('Error fetching chat conversations:', err);
    }
  };

  const loadConversation = async (conv: { event_id: number; sender_email: string; event_name: string; sender_name: string }) => {
    setSelectedConversation(conv);
    setChatLoading(true);
    try {
      // Get all messages for this conversation (from this user + organizer replies)
      const { data: userMsgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('event_id', conv.event_id)
        .eq('sender_email', conv.sender_email)
        .eq('sender_role', 'user')
        .order('created_at', { ascending: true });

      const { data: orgMsgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('event_id', conv.event_id)
        .eq('sender_email', conv.sender_email)
        .eq('organizer_address', walletState.address)
        .eq('sender_role', 'organizer')
        .order('created_at', { ascending: true });

      const allMsgs = [...(userMsgs || []), ...(orgMsgs || [])];
      const uniqueMsgs = Array.from(new Map(allMsgs.map(m => [m.id, m])).values())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setConversationMessages(uniqueMsgs);
    } catch (err) {
      console.error('Error loading conversation:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const sendOrganizerReply = async () => {
    if (!orgReplyMessage.trim() || !selectedConversation || !walletState.address) return;

    const newMsg = {
      event_id: selectedConversation.event_id,
      event_name: selectedConversation.event_name,
      sender_email: selectedConversation.sender_email,
      sender_name: user?.user_metadata?.name || 'Organizer',
      sender_role: 'organizer',
      organizer_address: walletState.address,
      message: orgReplyMessage.trim(),
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(newMsg)
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to send reply', description: error.message, variant: 'destructive' });
    } else if (data) {
      setConversationMessages(prev => [...prev, data]);
      setOrgReplyMessage('');
    }
  };

  // Handle Excel/CSV/Word file upload for email extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      let emails: string[] = [];
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel files
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
          for (const row of rows) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (typeof cell === 'string') {
                  const found = cell.match(emailRegex);
                  if (found) emails.push(...found);
                }
              }
            }
          }
        }
      } else if (fileName.endsWith('.docx')) {
        // Parse Word documents
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        const found = result.value.match(emailRegex);
        if (found) emails.push(...found);
      } else {
        // CSV, TXT, or any text file
        const text = await file.text();
        if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
          const lines = text.split(/[\r\n]+/);
          emails = lines
            .map(line => {
              const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
              return emailMatch ? emailMatch[0] : line.trim();
            })
            .filter(email => email && email.includes('@'));
        } else {
          emails = text.match(emailRegex) || [];
        }
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

      // Update invite emails for private events
      setEventForm(prev => ({
        ...prev,
        inviteEmails: prev.inviteEmails
          ? prev.inviteEmails + '\n' + uniqueEmails.join('\n')
          : uniqueEmails.join('\n')
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

  const eventTypeLabels: Record<string, string> = {
    'concert': '🎵 Concert',
    'festival': '🎪 Festival',
    'tech-conference': '💻 Tech Conference',
    'tech-meetup': '👥 Tech Meetup',
    'workshop': '🛠️ Workshop',
    'hackathon': '⚡ Hackathon',
    'networking': '🤝 Networking',
    'sports': '⚽ Sports',
    'exhibition': '🎨 Exhibition',
    'webinar': '📺 Webinar',
    'other': '📌 Other'
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

      // Switch to requests tab after event creation
      setActiveTab('requests');

      // Sync event to Supabase for user dashboard
      // IMPORTANT: Use blockchain event ID as Supabase ID so ticket_emails.event_id matches
      try {
        const blockchainId = parseInt(result.eventId);
        // Try insert with explicit blockchain ID first
        const { error: insertErr } = await supabase
          .from('events')
          .insert({
            id: blockchainId,
            name: eventForm.name,
            description: eventForm.description,
            date: eventForm.date.toISOString(),
            location: eventForm.location || 'Location TBA',
            total_tickets: parseInt(eventForm.maxTickets),
            available_tickets: parseInt(eventForm.maxTickets),
            price: eventForm.ticketPrice,
            organizer_address: walletState.address,
            transaction_hash: result.transactionHash,
            is_public: eventForm.isPublic,
            event_type: eventForm.eventType || 'other'
          });

        if (insertErr) {
          // If explicit ID fails (e.g. conflict), fall back to auto-increment
          const { error: fallbackErr } = await supabase
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
              is_public: eventForm.isPublic,
              event_type: eventForm.eventType || 'other'
            });
          if (fallbackErr) console.log('Note: Event sync skipped:', fallbackErr.message);
        }
        fetchOrgStats();
      } catch (err) {
        console.log('Note: Event sync skipped');
      }

      // Send invites for private events
      if (!eventForm.isPublic && eventForm.inviteEmails.trim()) {
        try {
          const emails = eventForm.inviteEmails
            .split('\n')
            .map(e => e.trim())
            .filter(e => e && e.includes('@'));

          const eventId = parseInt(result.eventId);
          const invites = emails.map(email => ({
            event_id: eventId,
            event_name: eventForm.name,
            event_type: eventForm.eventType || 'other',
            organizer_address: walletState.address,
            requester_email: email,
            requester_name: email.split('@')[0],
            status: 'invited',
            requested_at: new Date().toISOString(),
          }));

          const { error: inviteErr } = await supabase
            .from('enrollment_requests')
            .insert(invites);

          if (inviteErr) {
            console.log('Note: Some invites may have failed:', inviteErr.message);
          } else {
            toast({
              title: "Invitations Sent! 📧",
              description: `Sent ${emails.length} invite(s) for this private event.`,
            });
          }
        } catch (err) {
          console.log('Note: Invite sending skipped');
        }
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

          // Build QR as a real URL so phone cameras open it directly in the browser.
          // window.location.origin auto-adapts: localhost during dev, real domain when deployed,
          // or local IP (e.g. 192.168.x.x:5000) when accessed via network IP.
          const _ce = createdEvent as any;
          const _ef = eventForTicket as any;
          const qrPayload = btoa(unescape(encodeURIComponent(JSON.stringify({
            n: _ce?.name || _ef?.name || 'Event',
            d: _ce?.date || (_ef?.date ? new Date(_ef.date).toISOString() : ''),
            l: _ce?.location || _ef?.location || '',
            e: email,
            h: mintResult.transactionHash,
          }))));
          const verifyUrl = `${window.location.origin}/verify-ticket?eventId=${ticketForm.eventId}&ticketId=${mintResult.ticketId}&d=${encodeURIComponent(qrPayload)}`;

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

    // Access control: allow organizer wallet OR a volunteer email they added
    if (verifyForm.eventId) {
      try {
        const { data: eventRecord } = await supabase
          .from('events')
          .select('organizer_address')
          .eq('id', parseInt(verifyForm.eventId))
          .maybeSingle();

        if (eventRecord && eventRecord.organizer_address) {
          const isOrganizer = eventRecord.organizer_address.toLowerCase() === walletState.address?.toLowerCase();
          const storedVolunteers: string[] = (() => {
            try { return JSON.parse(localStorage.getItem(`volunteers_${verifyForm.eventId}`) || '[]'); } catch { return []; }
          })();
          const isVolunteer = user?.email && storedVolunteers.includes(user.email.toLowerCase());

          if (!isOrganizer && !isVolunteer) {
            toast({
              title: 'Access Denied 🔒',
              description: 'Only the event organizer or an authorized volunteer can verify tickets for this event.',
              variant: 'destructive',
            });
            return;
          }
        }
      } catch {
        // DB lookup failed — proceed (handles newly created events)
      }
    }

    // Verify against Supabase DB (instant, no blockchain tx needed — verifyTicket is view-only
    // but RPC is slow/unreliable; DB is the source of truth for tickets minted through this app)
    try {
      const { data: ticketRecord, error: dbErr } = await supabase
        .from('ticket_emails')
        .select('*')
        .eq('ticket_id', verifyForm.ticketId)
        .eq('event_id', parseInt(verifyForm.eventId))
        .maybeSingle();

      if (dbErr) throw dbErr;

      if (ticketRecord) {
        const isUsed = ticketRecord.status === 'used';
        const result = {
          valid: true,
          owner: ticketRecord.recipient_email || '',
          attendeeName: ticketRecord.recipient_email || 'Ticket Holder',
          isUsed,
        };
        setBadgeSent(ticketRecord.badge_sent === true);
        setVerificationResult({ ...result, event: undefined });
        toast({
          title: isUsed ? 'Ticket Already Used ⚠️' : 'Ticket Valid ✅',
          description: isUsed
            ? `This ticket for ${result.attendeeName} has already been used for entry.`
            : `Verified for ${result.attendeeName}`,
          variant: isUsed ? 'destructive' : 'default',
        });
      } else {
        setVerificationResult({ valid: false, owner: '', attendeeName: '', isUsed: false, event: undefined });
        toast({
          title: 'Invalid Ticket ❌',
          description: 'This ticket ID was not found for this event.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Verification DB error:', err);
      toast({
        title: 'Verification Error',
        description: 'Could not reach the database. Please try again.',
        variant: 'destructive',
      });
    }

    fetchOrgStats();
  };

  // Handle QR scan — supports URL format and legacy event: format
  const handleQRScan = (data: string) => {
    try {
      // NEW FORMAT: compact JSON — {"v":1,"eid":"1","tid":"2","n":"Event",...}
      // This is server-independent, works from any device without IP address config.
      try {
        const parsed = JSON.parse(data);
        if (parsed.eid) {
          if (qrScanType === 'event') {
            setTicketForm(prev => ({ ...prev, eventId: String(parsed.eid) }));
          } else if (qrScanType === 'verify') {
            setVerifyForm(prev => ({ ...prev, eventId: String(parsed.eid), ticketId: String(parsed.tid || '') }));
          }
          setIsQRScannerOpen(false);
          toast({ title: 'QR Scanned ✅', description: `Event: ${parsed.n || parsed.eid}` });
          return;
        }
      } catch { /* not JSON — fall through to URL / legacy formats */ }

      // LEGACY: verify-ticket URL (e.g. http://localhost:5000/verify-ticket?eventId=1&ticketId=2)
      if (data.includes('verify-ticket')) {
        const qs = data.includes('?') ? data.split('?')[1] : '';
        const qp = new URLSearchParams(qs);
        const eid = qp.get('eventId');
        const tid = qp.get('ticketId');
        if (eid && qrScanType === 'event') {
          setTicketForm(prev => ({ ...prev, eventId: eid }));
        } else if (eid && tid && qrScanType === 'verify') {
          setVerifyForm(prev => ({ ...prev, eventId: eid, ticketId: tid }));
        }
        setIsQRScannerOpen(false);
        toast({ title: 'QR Code Scanned', description: 'Form filled from ticket QR code.' });
        return;
      }

      // Legacy format: "event:12345" or "event:12345:ticket:67890:wallet:0xABC"
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
        toast({ title: 'QR Code Scanned', description: 'Data has been filled in the form.' });
        return;
      }

      toast({ title: 'Unrecognised QR Code', description: 'Please scan a BlockTix ticket QR code.', variant: 'destructive' });
    } catch (error) {
      toast({ title: 'Invalid QR Code', description: 'Could not parse QR code data.', variant: 'destructive' });
    }
  };

  // Load volunteers when verify event ID changes
  useEffect(() => {
    if (verifyForm.eventId) loadVolunteers(verifyForm.eventId);
    else setVolunteers([]);
  }, [verifyForm.eventId]);

  // Load event details when eventId changes for ticket form
  useEffect(() => {
    if (ticketForm.eventId && ticketForm.eventId !== eventForTicket?.id) {
      // Use contractService directly (bypasses useContract's toast-on-error)
      contractService.getEvent(ticketForm.eventId).then(event => {
        if (event) setEventForTicket(event);
      }).catch(() => {
        // Silently ignore — event may be newly created and blockchain not synced yet
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center space-x-2 group cursor-pointer flex-shrink-0" onClick={() => setLocation('/')}>
                <Box className="text-primary text-xl sm:text-2xl group-hover:scale-110 transition-transform" />
                <h1 className="text-lg sm:text-xl font-semibold font-bitcount tracking-normal">
                  <span className="text-white">Block</span>
                  <span className="text-primary">Tix</span>
                </h1>
              </div>
              <Badge variant="outline" className="hidden sm:flex text-xs border-primary/30 text-primary-foreground/70">
                Sepolia Testnet
              </Badge>
              {user && (
                <Badge variant="secondary" className="hidden md:flex text-xs bg-primary/10 text-primary truncate max-w-[140px]">
                  <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{user.user_metadata?.name || user.email}</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <WalletConnect />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 font-medium px-2 sm:px-3"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Sidebar — hidden on mobile, shown md+ */}
        <aside className="hidden md:block w-56 min-h-[calc(100vh-4rem)] bg-card/50 backdrop-blur-lg border-r border-border/50 sticky top-16 self-start">
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
              View Analytics
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
        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">

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

        {/* Navigation Tabs — hidden on mobile (bottom nav handles it), shown sm+ */}
        <Card className="mb-4 sm:mb-8 bg-card/50 backdrop-blur-lg border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-transparent p-0">
              <TabsTrigger
                value="create"
                className="flex items-center justify-center gap-1.5 py-3 sm:py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
                data-testid="tab-create-event"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm">Create Event</span>
              </TabsTrigger>
              <TabsTrigger
                value="verify"
                className="flex items-center justify-center gap-1.5 py-3 sm:py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
                data-testid="tab-verify-ticket"
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm">Verify</span>
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="flex items-center justify-center gap-1.5 py-3 sm:py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
              >
                <UserIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm">Requests</span>
                {enrollmentRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white px-1.5 py-0 text-[10px]">
                    {enrollmentRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="flex items-center justify-center gap-1.5 py-3 sm:py-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300"
                onClick={() => fetchChatConversations()}
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm">Messages</span>
                {chatConversations.length > 0 && (
                  <Badge className="ml-1 bg-purple-500 text-white px-1.5 py-0 text-[10px]">
                    {chatConversations.length}
                  </Badge>
                )}
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

                      <div>
                        <Label htmlFor="eventType">Event Type</Label>
                        <Select
                          value={eventForm.eventType}
                          onValueChange={(value) => setEventForm(prev => ({ ...prev, eventType: value }))}
                        >
                          <SelectTrigger id="eventType" data-testid="select-event-type">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="concert">🎵 Concert</SelectItem>
                            <SelectItem value="festival">🎪 Festival</SelectItem>
                            <SelectItem value="tech-conference">💻 Tech Conference</SelectItem>
                            <SelectItem value="tech-meetup">👥 Tech Community Meetup</SelectItem>
                            <SelectItem value="workshop">🛠️ Workshop</SelectItem>
                            <SelectItem value="hackathon">⚡ Hackathon</SelectItem>
                            <SelectItem value="networking">🤝 Networking Event</SelectItem>
                            <SelectItem value="sports">⚽ Sports Event</SelectItem>
                            <SelectItem value="exhibition">🎨 Exhibition</SelectItem>
                            <SelectItem value="webinar">📺 Webinar / Online</SelectItem>
                            <SelectItem value="other">📌 Other</SelectItem>
                          </SelectContent>
                        </Select>
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

                      {/* Private Event - Invite by Email */}
                      {!eventForm.isPublic && (
                        <div className="space-y-3 p-4 border border-amber-500/30 rounded-lg bg-amber-500/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-amber-400" />
                            <Label className="text-base font-semibold text-amber-300">Invite Users by Email</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Add email addresses of users you want to invite to this private event. They will receive enrollment invites.
                          </p>
                          <Textarea
                            value={eventForm.inviteEmails}
                            onChange={(e) => setEventForm(prev => ({ ...prev, inviteEmails: e.target.value }))}
                            placeholder="Enter email addresses (one per line)&#10;user1@gmail.com&#10;user2@gmail.com"
                            rows={4}
                            className="font-mono text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex-1">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.txt,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                              <div className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-amber-500/40 rounded-lg cursor-pointer hover:bg-amber-500/10 transition-colors text-sm text-amber-300">
                                <Upload className="w-4 h-4" />
                                {uploadingFile ? 'Processing...' : 'Upload Excel / Word / CSV'}
                              </div>
                            </label>
                          </div>
                          <p className="text-[10px] text-muted-foreground/60">
                            Supported: .xlsx, .xls, .csv, .txt, .docx — emails will be auto-extracted
                          </p>
                          {eventForm.inviteEmails && (
                            <div className="flex items-center gap-2 text-xs text-emerald-400">
                              <CheckCircle className="w-3 h-3" />
                              {eventForm.inviteEmails.split('\n').filter(e => e.trim() && e.includes('@')).length} email(s) ready to invite
                            </div>
                          )}
                        </div>
                      )}

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
                          6. Your event will appear on all registered users' dashboards
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
                            {eventForm.eventType && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Event Type:</span>
                                <p className="font-medium text-white">
                                  {eventTypeLabels[eventForm.eventType] || eventForm.eventType}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <Alert className="bg-green-500/10 border-green-500/20 text-green-400 mt-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Event ID <strong className="text-white">{createdEventId}</strong> is now live. Users can see this event on their dashboard and enroll for it. Review enrollment requests in the Requests tab.
                          </AlertDescription>
                        </Alert>
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

                    {/* Volunteer Management */}
                    <div className="mt-6 border-t border-border/40 pt-5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5" /> Authorized Volunteers
                      </p>
                      <p className="text-muted-foreground text-xs mb-3">Add volunteer / staff emails who can also verify tickets for this event. Stored locally on this device.</p>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="volunteer@email.com"
                          value={volunteerInput}
                          onChange={e => setVolunteerInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVolunteer())}
                          className="flex-1 text-sm"
                        />
                        <Button type="button" onClick={addVolunteer} size="sm" variant="outline">
                          Add
                        </Button>
                      </div>
                      {volunteers.length > 0 ? (
                        <div className="space-y-1.5">
                          {volunteers.map(email => (
                            <div key={email} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                              <span className="text-xs text-white font-mono">{email}</span>
                              <button
                                type="button"
                                onClick={() => removeVolunteer(email)}
                                className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">No volunteers added yet for this event.</p>
                      )}
                    </div>
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
                                      const { error: updateError } = await supabase
                                        .from('ticket_emails')
                                        .update({ status: 'used' })
                                        .eq('event_id', parseInt(verifyForm.eventId))
                                        .eq('ticket_id', verifyForm.ticketId);

                                      if (updateError) throw updateError;

                                      // Update UI instantly — no need to re-verify
                                      setVerificationResult(prev => prev ? { ...prev, isUsed: true } : prev);

                                      toast({
                                        title: 'Ticket Marked as Used ✓',
                                        description: 'This ticket cannot be used again for entry.',
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: 'Failed to Mark Ticket',
                                        description: error.message,
                                        variant: 'destructive',
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
                                onClick={async () => {
                                  if (badgeSent) return;
                                  try {
                                    const { error: badgeErr } = await supabase
                                      .from('ticket_emails')
                                      .update({ badge_sent: true })
                                      .eq('event_id', parseInt(verifyForm.eventId))
                                      .eq('ticket_id', verifyForm.ticketId);
                                    if (badgeErr) throw badgeErr;
                                    setBadgeSent(true);
                                    toast({
                                      title: 'Badge Sent ✓',
                                      description: `The event badge has been sent to ${verificationResult?.attendeeName}. They can download it from their dashboard.`,
                                    });
                                  } catch (err: any) {
                                    toast({
                                      title: 'Failed to Send Badge',
                                      description: err.message,
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                                variant="outline"
                                disabled={badgeSent}
                                className={`flex-1 border-primary/30 ${
                                  badgeSent
                                    ? 'opacity-60 cursor-not-allowed bg-green-500/10 border-green-500/30 text-green-400'
                                    : 'hover:bg-primary/10'
                                }`}
                                data-testid="button-send-badge"
                              >
                                <Star className="w-4 h-4 mr-2" />
                                {badgeSent ? 'Badge Sent ✓' : 'Send Badge'}
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
                                {request.event_type && (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 text-primary/80">
                                    {eventTypeLabels[request.event_type] || request.event_type}
                                  </Badge>
                                )}
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
                                <div>
                                  <span className="text-muted-foreground block text-xs uppercase tracking-wider font-bold mb-1">Enrollment Photo</span>
                                  {request.has_photo ? (
                                    <span className="text-green-400 font-medium flex items-center gap-1.5">
                                      <Camera className="w-3.5 h-3.5" />
                                      Photo ✓
                                      <button
                                        onClick={() => {
                                          setPhotoViewerData({
                                            photoPath: request.photo_path,
                                            encryptionKey: request.photo_encryption_key,
                                            encryptionIv: request.photo_encryption_iv,
                                            requesterName: request.requester_name,
                                          });
                                          setPhotoViewerOpen(true);
                                        }}
                                        className="ml-1 text-xs text-primary underline hover:text-primary/80"
                                      >
                                        View
                                      </button>
                                    </span>
                                  ) : (
                                    <span className="text-red-400 font-medium flex items-center gap-1.5">
                                      <XCircle className="w-3.5 h-3.5" />
                                      No Photo
                                    </span>
                                  )}
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

            {/* Support & Ads moved → /support-dashboard */}

            {/* Messages Tab — Organizer Chat Inbox */}
            <TabsContent value="messages" className="mt-0">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Messages</h2>
                  <p className="text-muted-foreground">View and respond to messages from users about your events</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Conversation List */}
                  <div className="lg:col-span-1 space-y-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Conversations</h3>
                    {chatConversations.length === 0 ? (
                      <Card className="bg-card/30 border-border border-dashed">
                        <CardContent className="p-8 text-center">
                          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No messages yet</p>
                        </CardContent>
                      </Card>
                    ) : (
                      chatConversations.map((conv, idx) => (
                        <Card
                          key={`${conv.event_id}-${conv.sender_email}-${idx}`}
                          className={`cursor-pointer transition-all hover:border-purple-500/50 ${
                            selectedConversation?.event_id === conv.event_id && selectedConversation?.sender_email === conv.sender_email
                              ? 'bg-purple-500/10 border-purple-500/50'
                              : 'bg-card/40 border-border'
                          }`}
                          onClick={() => loadConversation(conv)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{conv.sender_name}</p>
                                <p className="text-xs text-primary truncate">{conv.event_name}</p>
                                <p className="text-xs text-muted-foreground truncate mt-1">{conv.last_message}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(conv.last_time).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  {/* Chat Window */}
                  <div className="lg:col-span-2">
                    {selectedConversation ? (
                      <Card className="bg-card/40 border-border flex flex-col" style={{ minHeight: '400px', maxHeight: '500px' }}>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-border flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{selectedConversation.sender_name}</p>
                            <p className="text-xs text-muted-foreground">{selectedConversation.sender_email} · {selectedConversation.event_name}</p>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {chatLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <p className="text-sm text-muted-foreground">Loading messages...</p>
                            </div>
                          ) : conversationMessages.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                              <p className="text-sm text-muted-foreground">No messages in this conversation</p>
                            </div>
                          ) : (
                            conversationMessages.map((msg) => (
                              <div key={msg.id} className={`flex ${msg.sender_role === 'organizer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-lg p-3 ${
                                  msg.sender_role === 'organizer'
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-muted/50 border border-border'
                                }`}>
                                  <p className={`text-xs font-semibold mb-1 ${
                                    msg.sender_role === 'organizer' ? 'text-white/80' : 'text-primary'
                                  }`}>
                                    {msg.sender_role === 'organizer' ? 'You' : msg.sender_name}
                                  </p>
                                  <p className="text-sm text-white">{msg.message}</p>
                                  <p className={`text-[10px] mt-1 ${
                                    msg.sender_role === 'organizer' ? 'text-white/60' : 'text-muted-foreground'
                                  }`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Reply Input */}
                        <div className="p-4 border-t border-border flex gap-2">
                          <input
                            type="text"
                            value={orgReplyMessage}
                            onChange={(e) => setOrgReplyMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && orgReplyMessage.trim()) {
                                sendOrganizerReply();
                              }
                            }}
                            placeholder="Type your reply..."
                            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <Button
                            onClick={sendOrganizerReply}
                            disabled={!orgReplyMessage.trim()}
                            className="px-4 bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            Send
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="bg-card/30 border-border border-dashed flex items-center justify-center" style={{ minHeight: '400px' }}>
                        <CardContent className="text-center">
                          <MessageCircle className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                          <p className="text-muted-foreground">Select a conversation to view messages</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
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

      {/* Enrollment Photo Viewer */}
      <PhotoViewer
        isOpen={photoViewerOpen}
        onClose={() => setPhotoViewerOpen(false)}
        photoPath={photoViewerData.photoPath}
        encryptionKey={photoViewerData.encryptionKey}
        encryptionIv={photoViewerData.encryptionIv}
        requesterName={photoViewerData.requesterName}
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

      {/* Mobile Bottom Navigation — visible on mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-stretch justify-around h-16">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${activeTab === 'create' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Plus className="w-5 h-5" />
            Create
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${activeTab === 'verify' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Shield className="w-5 h-5" />
            Verify
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${activeTab === 'requests' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <UserIcon className="w-5 h-5" />
            Requests
            {enrollmentRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-18px)] bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                {enrollmentRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setLocation('/dashboard')}
            className="flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
        </div>
      </nav>

    </div>
  );
}
