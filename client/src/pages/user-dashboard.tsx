import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@/hooks/use-wallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/neon-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';
import {
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Clock,
  LogOut,
  UserCircle,
  QrCode,
  History,
  Star,
  TrendingUp,
  Mail,
  User as UserIcon,
  CheckCircle,
  Crown,
  Settings,
  Trophy,
  MessageCircle,
  Megaphone,
  Zap,
  XCircle,
  CreditCard,
  Wallet,
  FileText,
  ChevronRight,
  Edit,
  Save,
  X,
  AlertCircle,
  Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Event {
  id: number;
  event_id?: number;
  name: string;
  date: string;
  location: string;
  description: string;
  total_tickets: number;
  available_tickets: number;
  price: string;
  organizer_address?: string;
  organizer_name?: string;
}

interface UserTicket {
  id: number;
  ticket_id: string;
  event_id: number;
  event_name: string;
  event_date: string;
  event_location: string;
  recipient_email: string;
  unique_hash: string;
  qr_data: string;
  used: boolean;
  purchased_at: string;
  organizer_name?: string;
}

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { walletState } = useWallet();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState({ fullName: '', email: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [userAppliedEvents, setUserAppliedEvents] = useState<number[]>([]);
  const [userAcceptedEvents, setUserAcceptedEvents] = useState<number[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  // Profile & Settings
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', email: '' });
  const [eventsAttended, setEventsAttended] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfileForm, setTempProfileForm] = useState({ username: '', email: '' });
  
  // Subscription
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [userSubscription, setUserSubscription] = useState<'free' | 'premium' | 'gold'>('free');
  
  // Ad Request
  const [adRequestDialogOpen, setAdRequestDialogOpen] = useState(false);
  const [adRequestForm, setAdRequestForm] = useState({ 
    description: '', 
    adType: 'banner', 
    contactEmail: '', 
    businessName: '',
    imageFile: null as File | null,
    imagePreview: '' 
  });
  
  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatType, setChatType] = useState<'organizer' | 'support'>('support');
  const [chatMessage, setChatMessage] = useState('');
  const [supportAssigned, setSupportAssigned] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'support', name: 'Support Team', message: 'Hey! How can we help you today?', timestamp: new Date(Date.now() - 3600000) },
  ]);
  const [organizerChatOpen, setOrganizerChatOpen] = useState(false);
  const [selectedEventForChat, setSelectedEventForChat] = useState<Event | null>(null);
  const [organizerMessages, setOrganizerMessages] = useState<any[]>([]);
  
  // Sidebar and Payment
  const [activeSidebarSection, setActiveSidebarSection] = useState<'dashboard' | 'settings' | 'payments' | 'attended' | 'pending'>('dashboard');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([
    { id: 1, type: 'Subscription', plan: 'Premium', amount: '₹799', date: new Date(Date.now() - 86400000 * 15), status: 'completed' },
    { id: 2, type: 'Event Ticket', eventName: 'Web3 Summit', amount: '₹0.03 ETH', date: new Date(Date.now() - 86400000 * 7), status: 'completed' },
  ]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Approved Ads
  const [approvedAds, setApprovedAds] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setLocation('/user-login');
      return;
    }

    // Clear all user-specific state when user changes
    setUserAppliedEvents([]);
    setUserAcceptedEvents([]);
    setUserTickets([]);
    setEvents([]);
    setEventsAttended(0);

    fetchData();
    
    // Load approved ads from localStorage
    const loadApprovedAds = () => {
      try {
        const storedAds = localStorage.getItem('approvedAds');
        if (storedAds) {
          setApprovedAds(JSON.parse(storedAds));
        }
      } catch (error) {
        console.error('Error loading approved ads:', error);
      }
    };
    
    loadApprovedAds();
    
    // Poll for changes to approved ads every 2 seconds
    const adsInterval = setInterval(loadApprovedAds, 2000);

    // Set up real-time subscription for new tickets
    const ticketsSubscription = supabase
      .channel('tickets_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tickets'
      }, (payload) => {
        console.log('New ticket detected:', payload);
        // Refresh data when new ticket is added
        fetchData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickets'
      }, (payload) => {
        console.log('Ticket updated:', payload);
        // Refresh data when ticket is updated
        fetchData();
      })
      .subscribe();

    // Set up real-time subscription for new events
    const eventsSubscription = supabase
      .channel('events_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, (payload) => {
        console.log('New event detected:', payload);
        // Refresh data when new event is added
        fetchData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'events'
      }, (payload) => {
        console.log('Event updated:', payload);
        // Refresh data when event is updated
        fetchData();
      })
      .subscribe();

    return () => {
      clearInterval(adsInterval);
      ticketsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, [user]);

  const fetchData = async () => {
    try {
      // Reset user-specific state when fetching new data
      setUserAppliedEvents([]);
      setUserAcceptedEvents([]);
      setUserTickets([]);
      
      // Fetch real public events from Supabase
      const { data: realEventsData } = await supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('date', { ascending: true });

      // Static demo events for users to see (mix of free and paid)
      const staticEvents = [
        {
          id: 9999,
          event_id: 9999,
          name: 'Tech Conference 2026',
          description: 'Annual technology conference featuring industry leaders and innovators from around the world',
          date: '2026-03-15T10:00:00Z',
          location: 'San Francisco, CA',
          total_tickets: 500,
          available_tickets: 450,
          price: '0.05',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'TechCorp Events',
          is_active: true,
          is_public: true
        },
        {
          id: 9998,
          event_id: 9998,
          name: 'Web3 Summit',
          description: 'Exploring the future of decentralized web and blockchain technology',
          date: '2026-04-20T09:00:00Z',
          location: 'New York, NY',
          total_tickets: 300,
          available_tickets: 275,
          price: '0.03',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'Web3 Foundation',
          is_active: true,
          is_public: true
        },
        {
          id: 9997,
          event_id: 9997,
          name: 'Blockchain Expo',
          description: 'Global blockchain technology exhibition and networking event',
          date: '2026-05-10T11:00:00Z',
          location: 'London, UK',
          total_tickets: 1000,
          available_tickets: 850,
          price: '0.08',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'Blockchain Alliance',
          is_active: true,
          is_public: true
        },
        {
          id: 9996,
          event_id: 9996,
          name: 'AI & Machine Learning Summit',
          description: 'Deep dive into artificial intelligence and machine learning innovations',
          date: '2026-06-05T13:00:00Z',
          location: 'Tokyo, Japan',
          total_tickets: 400,
          available_tickets: 320,
          price: '0.06',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'AI Research Labs',
          is_active: true,
          is_public: true
        },
        {
          id: 9995,
          event_id: 9995,
          name: 'Community Meetup - Free Event',
          description: 'Free networking event for blockchain enthusiasts and developers',
          date: '2026-03-25T18:00:00Z',
          location: 'Austin, TX',
          total_tickets: 200,
          available_tickets: 150,
          price: '0.0',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'Crypto Community',
          is_active: true,
          is_public: true
        },
        {
          id: 9994,
          event_id: 9994,
          name: 'NFT Art Gallery Opening',
          description: 'Exclusive NFT art exhibition featuring renowned digital artists',
          date: '2026-04-10T19:00:00Z',
          location: 'Los Angeles, CA',
          total_tickets: 150,
          available_tickets: 100,
          price: '0.02',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'Digital Art Collective',
          is_active: true,
          is_public: true
        },
        {
          id: 9993,
          event_id: 9993,
          name: 'Startup Pitch Night - Free',
          description: 'Free event for startups to pitch their ideas to investors',
          date: '2026-05-05T17:00:00Z',
          location: 'Boston, MA',
          total_tickets: 250,
          available_tickets: 200,
          price: '0.0',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'Startup Accelerator',
          is_active: true,
          is_public: true
        },
        {
          id: 9992,
          event_id: 9992,
          name: 'Crypto Trading Workshop',
          description: 'Learn advanced cryptocurrency trading strategies and technical analysis',
          date: '2026-05-20T14:00:00Z',
          location: 'Miami, FL',
          total_tickets: 100,
          available_tickets: 75,
          price: '0.04',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          organizer_name: 'Trading Academy',
          is_active: true,
          is_public: true
        }
      ];

      // Combine real events with static demo events
      const allEvents = [...(realEventsData || []), ...staticEvents];
      setEvents(allEvents as any);

      // Fetch tickets sent to user's email from ticket_emails table
      if (user?.email) {
        const { data: ticketEmailsData } = await supabase
          .from('ticket_emails')
          .select('*')
          .eq('recipient_email', user.email)
          .order('created_at', { ascending: false });

        if (ticketEmailsData) {
          // Fetch event details for each ticket
          const ticketsWithEvents = await Promise.all(
            ticketEmailsData.map(async (ticket: any) => {
              const { data: eventData } = await supabase
                .from('events')
                .select('name, date, location')
                .eq('id', ticket.event_id)
                .single();

              // Find organizer name from demo events if available
              const demoEvent = staticEvents.find(e => e.event_id === ticket.event_id);

              return {
                id: ticket.id,
                ticket_id: ticket.ticket_id,
                event_id: ticket.event_id,
                event_name: eventData?.name || 'Unknown Event',
                event_date: eventData?.date || '',
                event_location: eventData?.location || '',
                recipient_email: ticket.recipient_email,
                unique_hash: ticket.unique_hash,
                qr_data: ticket.qr_data,
                used: ticket.status === 'used',
                purchased_at: ticket.created_at,
                organizer_name: demoEvent?.organizer_name || 'Event Organizer'
              };
            })
          );
          setUserTickets(ticketsWithEvents as any);
        }
      }

      // Also fetch legacy tickets from tickets table
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select(`
          *,
          events!inner(name, date, location)
        `)
        .eq('owner_address', user?.email)
        .order('created_at', { ascending: false });

      if (ticketsData && ticketsData.length > 0) {
        // Transform and merge with existing tickets
        const transformedTickets = ticketsData.map((ticket: any) => ({
          id: ticket.id,
          ticket_id: ticket.ticket_id,
          event_id: ticket.event_id,
          event_name: ticket.events?.name || 'Unknown Event',
          event_date: ticket.events?.date || '',
          event_location: ticket.events?.location || '',
          recipient_email: user?.email || '',
          unique_hash: ticket.transaction_hash || '',
          qr_data: '',
          used: ticket.used || false,
          purchased_at: ticket.created_at
        }));
        
        setUserTickets(prev => [...prev, ...transformedTickets] as any);
      }

      // Fetch user's applied events to prevent reapplying (only if user is logged in)
      if (user?.email) {
        const { data: appliedRequestsData } = await supabase
          .from('enrollment_requests')
          .select('event_id, status')
          .eq('requester_email', user.email);

        if (appliedRequestsData && appliedRequestsData.length > 0) {
          setUserAppliedEvents(appliedRequestsData.map((r: any) => r.event_id));
          // Track accepted/approved requests
          const acceptedEvents = appliedRequestsData
            .filter((r: any) => r.status === 'approved')
            .map((r: any) => r.event_id);
          setUserAcceptedEvents(acceptedEvents);
        } else {
          // No requests found, ensure arrays are empty
          setUserAppliedEvents([]);
          setUserAcceptedEvents([]);
        }
      }

      // Calculate events attended (used tickets)
      const attendedCount = userTickets?.filter((t: any) => t.used).length || 0;
      setEventsAttended(attendedCount);

      // Initialize profile form with user data
      if (user) {
        const userData = {
          username: user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || ''
        };
        setProfileForm(userData);
        setTempProfileForm(userData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  const handleEnrollClick = (event: Event) => {
    setSelectedEvent(event);
    // Pre-populate email with logged-in user's email
    setEnrollmentForm({
      fullName: user?.user_metadata?.name || '',
      email: user?.email || ''
    });
    setEnrollmentOpen(true);
  };

  const handleEnrollmentSubmit = async () => {
    if (!enrollmentForm.fullName || !enrollmentForm.email || !selectedEvent) {
      return;
    }

    setEnrolling(true);
    try {
      // Create an enrollment request for the organizer
      const { error } = await supabase
        .from('enrollment_requests')
        .insert({
          event_id: selectedEvent.event_id || selectedEvent.id,
          event_name: selectedEvent.name,
          organizer_address: selectedEvent.organizer_address,
          requester_email: enrollmentForm.email,
          requester_name: enrollmentForm.fullName,
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to send enrollment request:', error);
        alert('Failed to send request. Please make sure the database is set up correctly.');
      } else {
        alert('Enrollment request sent successfully! The organizer will review your request.');
        setEnrollmentOpen(false);
        setEnrollmentForm({ fullName: '', email: '' });
        setSelectedEvent(null);
        
        // Add to applied events list
        setUserAppliedEvents(prev => [...prev, selectedEvent.event_id || selectedEvent.id]);
      }
    } catch (error) {
      console.error('Error sending enrollment request:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  // Calculate discounted price based on subscription tier
  const getDiscountedPrice = (originalPrice: string): { displayPrice: string, isFree: boolean, discount: number } => {
    const priceNum = parseFloat(originalPrice);
    
    if (userSubscription === 'gold') {
      return { displayPrice: '0.0', isFree: true, discount: 100 };
    } else if (userSubscription === 'premium') {
      const discountedPrice = priceNum * 0.9; // 10% discount
      return { displayPrice: discountedPrice.toFixed(2), isFree: false, discount: 10 };
    }
    
    return { displayPrice: originalPrice, isFree: false, discount: 0 };
  };

  // Handle payment for paid events
  const handlePayForEvent = async (event: Event) => {
    setSelectedEventForPayment(event);
    setPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    if (!selectedEventForPayment) return;
    
    setProcessingPayment(true);
    
    try {
      const { displayPrice, isFree } = getDiscountedPrice(selectedEventForPayment.price);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add to payment history
      const newPayment = {
        id: paymentHistory.length + 1,
        type: 'Event Ticket',
        eventName: selectedEventForPayment.name,
        amount: isFree ? 'FREE (Gold Tier)' : `₹${(parseFloat(displayPrice) * 83 * 100000).toFixed(0)}`,
        date: new Date(),
        status: 'completed'
      };
      
      setPaymentHistory([newPayment, ...paymentHistory]);
      
      toast({
        title: "Payment Successful! 🎉",
        description: `You can now request enrollment for ${selectedEventForPayment.name}`
      });
      
      setPaymentDialogOpen(false);
      setSelectedEventForPayment(null);
      
      // Auto-open enrollment after payment
      setTimeout(() => {
        handleEnrollClick(selectedEventForPayment);
      }, 500);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Please try again or contact support."
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-xl border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
                <TicketIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold font-bitcount tracking-normal">
                  <span className="text-white">Block</span>
                  <span className="text-primary">Tix</span>
                </h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">User Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 font-medium"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <Card className="bg-card/40 backdrop-blur-sm border-border sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveSidebarSection('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSidebarSection === 'dashboard' 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <TicketIcon className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveSidebarSection('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSidebarSection === 'settings' 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">User Settings</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveSidebarSection('payments')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSidebarSection === 'payments' 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">Payment History</span>
                    <Badge className={`ml-auto text-xs ${
                      activeSidebarSection === 'payments'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>{paymentHistory.length}</Badge>
                  </button>
                  
                  <button
                    onClick={() => setActiveSidebarSection('attended')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSidebarSection === 'attended' 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Trophy className="h-5 w-5" />
                    <span className="font-medium">Events Attended</span>
                    <Badge className={`ml-auto text-xs ${
                      activeSidebarSection === 'attended'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>{eventsAttended}</Badge>
                  </button>
                  
                  <button
                    onClick={() => setActiveSidebarSection('pending')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSidebarSection === 'pending' 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Pending Approval</span>
                    <Badge className={`ml-auto text-xs ${
                      activeSidebarSection === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>{userAppliedEvents.length - userAcceptedEvents.length}</Badge>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1">
            {activeSidebarSection === 'dashboard' && (
              <>
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Tickets Issued</p>
                  <p className="text-4xl font-semibold text-white mt-1 font-bitcount tracking-normal">{userTickets.length}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-glow shadow-primary/5">
                  <TicketIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Events Attended</p>
                  <p className="text-4xl font-semibold text-white mt-1 font-bitcount tracking-normal">{eventsAttended}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-glow shadow-emerald-500/5">
                  <Trophy className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Available Tickets</p>
                  <p className="text-4xl font-semibold text-white mt-1 font-bitcount tracking-normal">
                    {userTickets.filter((t: any) => !t.used).length}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-glow shadow-primary/5">
                  <Star className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/30 cursor-pointer hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300"
            onClick={() => setSubscriptionDialogOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    {userSubscription === 'free' ? 'Unlock Premium Features' : 'Current Plan'}
                  </p>
                  <p className="text-2xl font-semibold text-white capitalize flex items-center gap-2">
                    {userSubscription === 'free' ? (
                      <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent font-bold">
                        Upgrade Now!
                      </span>
                    ) : (
                      <>
                        {userSubscription}
                        {userSubscription === 'premium' && <Crown className="h-6 w-6 text-yellow-500 animate-pulse" />}
                        {userSubscription === 'gold' && <Zap className="h-6 w-6 text-amber-400 animate-pulse" />}
                      </>
                    )}
                  </p>
                  {userSubscription === 'free' && (
                    <p className="text-xs text-muted-foreground mt-1">Get discounts & priority access</p>
                  )}
                </div>
                <div className={`p-4 rounded-xl border shadow-glow ${
                  userSubscription === 'gold' ? 'bg-amber-500/20 border-amber-500/40 shadow-amber-500/20' :
                  userSubscription === 'premium' ? 'bg-yellow-500/20 border-yellow-500/40 shadow-yellow-500/20' :
                  'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-amber-500/30'
                }`}>
                  <Crown className={`h-10 w-10 ${
                    userSubscription === 'gold' ? 'text-amber-400' :
                    userSubscription === 'premium' ? 'text-yellow-500' :
                    'text-amber-500 animate-bounce'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-muted/30 border border-border p-1 gap-1">
            <TabsTrigger
              value="events"
              className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Available Events
            </TabsTrigger>
            <TabsTrigger
              value="tickets"
              className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
            >
              <QrCode className="mr-2 h-4 w-4" />
              All Tickets
            </TabsTrigger>
          </TabsList>

          {/* Available Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {events.length === 0 ? (
              <Card className="bg-card/30 border-border border-dashed">
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">No events available at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Display Approved Ads or "Your Ad Here" Card */}
                {approvedAds.length > 0 ? (
                  approvedAds.map((ad) => (
                    <Card 
                      key={ad.id}
                      className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-amber-500/10 backdrop-blur-sm border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 group overflow-hidden"
                    >
                      {ad.image_url && (
                        <div className="w-full h-48 overflow-hidden border-b border-purple-500/20">
                          <img 
                            src={ad.image_url} 
                            alt={ad.business_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardHeader className="border-b border-purple-500/30 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs uppercase font-bold">
                                Sponsored
                              </Badge>
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs uppercase">
                                {ad.ad_type}
                              </Badge>
                            </div>
                            <CardTitle className="text-white text-xl mb-2 group-hover:text-purple-400 transition-colors flex items-center gap-2">
                              <Zap className="h-6 w-6 text-purple-400" />
                              {ad.business_name}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">{ad.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Contact: <span className="text-purple-400">{ad.contact_email}</span>
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `mailto:${ad.contact_email}`}
                            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          Approved on {new Date(ad.approved_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card 
                    className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/10 backdrop-blur-sm border-amber-500/30 hover:border-amber-500/50 transition-all duration-300 group cursor-pointer"
                    onClick={() => setAdRequestDialogOpen(true)}
                  >
                    <CardHeader className="border-b border-amber-500/30 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2 group-hover:text-amber-400 transition-colors flex items-center gap-2">
                            <Megaphone className="h-6 w-6 text-amber-400" />
                            Your Ad Here
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">Promote your business or event to thousands of attendees!</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p className="flex items-center"><span className="text-amber-400 mr-2">✦</span> Banner Ads on Dashboard</p>
                        <p className="flex items-center"><span className="text-amber-400 mr-2">✦</span> Featured Event Listings</p>
                        <p className="flex items-center"><span className="text-amber-400 mr-2">✦</span> Email Promotions</p>
                        <p className="flex items-center"><span className="text-amber-400 mr-2">✦</span> Social Media Shoutouts</p>
                      </div>
                      <Button
                        variant="solid"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-glow shadow-amber-500/20 flex items-center justify-center gap-2"
                      >
                        <Megaphone className="h-4 w-4" />
                        <span>Request Ad Space</span>
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                {events.map((event) => (
                  <Card key={event.id} className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 group">
                    <CardHeader className="border-b border-border/50 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2 group-hover:text-primary transition-colors">{event.name}</CardTitle>
                          <CardDescription className="text-muted-foreground line-clamp-2">{event.description}</CardDescription>
                          {event.organizer_name && (
                            <p className="text-xs text-primary/70 mt-2 flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              Organized by {event.organizer_name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const isPaid = parseFloat(event.price) > 0;
                            const { displayPrice, isFree, discount } = getDiscountedPrice(event.price);
                            
                            return (
                              <>
                                <Badge className={`px-3 py-1 font-bold ${
                                  !isPaid || isFree
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}>
                                  {!isPaid ? '🎉 FREE' : isFree ? '🎉 FREE (Gold)' : `💰 ${displayPrice} ETH`}
                                </Badge>
                                {discount > 0 && !isFree && (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-2 py-1 text-xs">
                                    {discount}% OFF
                                  </Badge>
                                )}
                                {discount > 0 && isPaid && (
                                  <p className="text-[10px] text-muted-foreground line-through">
                                    {event.price} ETH
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          {userAcceptedEvents.includes(event.event_id || event.id) && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-2 py-1 text-xs">
                              ✓ Accepted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center text-muted-foreground text-xs uppercase tracking-widest font-bold">
                          <Calendar className="mr-2 h-4 w-4 text-primary" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground text-xs uppercase tracking-widest font-bold">
                          <Clock className="mr-2 h-4 w-4 text-primary" />
                          <span>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground text-xs uppercase tracking-widest font-bold col-span-2">
                          <MapPin className="mr-2 h-4 w-4 text-primary" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground text-xs uppercase tracking-widest font-bold col-span-2">
                          <TicketIcon className="mr-2 h-4 w-4 text-primary" />
                          <span>{event.available_tickets} / {event.total_tickets} Available</span>
                        </div>
                      </div>

                      {event.available_tickets > 0 ? (
                        <div className="flex gap-2">
                          <Button
                            variant="solid"
                            onClick={() => handleEnrollClick(event)}
                            disabled={userAppliedEvents.includes(event.event_id || event.id)}
                            className="flex-1 shadow-glow shadow-primary/10 flex items-center justify-center gap-2"
                          >
                            <UserIcon className="h-4 w-4" />
                            <span>
                              {userAcceptedEvents.includes(event.event_id || event.id) 
                                ? '✓ Accepted - Awaiting Ticket' 
                                : userAppliedEvents.includes(event.event_id || event.id) 
                                  ? '⏳ Request Pending' 
                                  : 'Request Enrollment'}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedEventForChat(event);
                              setOrganizerMessages([
                                { id: 1, sender: 'organizer', name: event.name + ' Team', message: 'Hello! How can we assist you with this event?', timestamp: new Date() }
                              ]);
                              setOrganizerChatOpen(true);
                            }}
                            className="border-primary/30 hover:bg-primary/10 flex items-center justify-center"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button disabled variant="ghost" className="w-full opacity-50 cursor-not-allowed">
                          Sold Out
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">All Issued Tickets</h2>
              <p className="text-slate-400">View all tickets issued by organizers for upcoming events</p>
            </div>
            {userTickets.length === 0 ? (
              <Card className="bg-card/30 border-border border-dashed">
                <CardContent className="p-12 text-center">
                  <QrCode className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">No tickets have been issued yet</p>
                  <p className="text-muted-foreground/60 text-sm mt-2">Tickets will appear here when organizers create them</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {userTickets.map((ticket: any) => (
                  <Card key={ticket.id} className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 group overflow-hidden">
                    <div className={`h-1.5 w-full ${ticket.used ? 'bg-muted' : 'bg-primary'}`} />
                    <CardHeader className="border-b border-border/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white group-hover:text-primary transition-colors text-lg mb-1">{ticket.event_name || 'Unknown Event'}</CardTitle>
                          {ticket.organizer_name && (
                            <p className="text-xs text-primary/60 mb-1 flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {ticket.organizer_name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">Event #{ticket.event_id || 'N/A'}</span>
                            <span>•</span>
                            <span className="font-mono">Ticket #{ticket.ticket_id || 'N/A'}</span>
                          </div>
                        </div>
                        <Badge className={`${ticket.used
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'} px-3 py-1 font-bold`}>
                          {ticket.used ? "✓ Used" : "✓ Valid"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-3">
                        {ticket.used && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-2">
                            <p className="text-xs text-red-400 font-medium flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              <span><strong>Ticket Used:</strong> This ticket has been verified and marked as used. It cannot be used again for entry.</span>
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Date</span>
                            <div className="flex items-center text-white font-medium text-sm">
                              <Calendar className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                              {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'TBA'}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Time</span>
                            <div className="flex items-center text-white font-medium text-sm">
                              <Clock className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                              {ticket.event_date ? new Date(ticket.event_date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true
                              }) : 'TBA'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Location</span>
                          <div className="flex items-center text-white font-medium text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                            <span className="line-clamp-1">{ticket.event_location || 'Location TBA'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Event ID</span>
                            <div className="flex items-center font-mono text-emerald-400 text-xs font-semibold">
                              #{ticket.event_id || 'N/A'}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Ticket ID</span>
                            <div className="flex items-center font-mono text-purple-400 text-xs font-semibold">
                              {ticket.ticket_id || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => {
                        setSelectedTicket(ticket);
                        setQrDialogOpen(true);
                      }}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Show QR Code
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </>
            )}

            {/* User Settings Section */}
            {activeSidebarSection === 'settings' && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                    <Settings className="h-8 w-8 text-primary" />
                    User Settings
                  </h2>
                  <p className="text-muted-foreground text-base">Manage your account preferences and profile information</p>
                </div>

                {/* Profile Information Card */}
                <Card className="bg-gradient-to-br from-card/60 via-card/40 to-transparent backdrop-blur-xl border-border/50 shadow-2xl">
                  <CardHeader className="border-b border-border/30 pb-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-xl flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                          <UserCircle className="h-6 w-6 text-primary" />
                        </div>
                        Profile Information
                      </CardTitle>
                      {!isEditingProfile ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingProfile(true);
                            setTempProfileForm({ ...profileForm });
                          }}
                          className="border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setTempProfileForm({ ...profileForm });
                            }}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                          <Button
                            variant="solid"
                            size="sm"
                            onClick={() => {
                              setProfileForm({ ...tempProfileForm });
                              supabase.auth.updateUser({
                                data: { name: tempProfileForm.username }
                              }).then(() => {
                                toast({
                                  title: "Profile Updated",
                                  description: "Your profile has been updated successfully!"
                                });
                                setIsEditingProfile(false);
                              });
                            }}
                            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-8 space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wider">
                        <UserCircle className="h-4 w-4 text-primary" />
                        Username
                      </label>
                      <input
                        type="text"
                        value={isEditingProfile ? tempProfileForm.username : profileForm.username}
                        onChange={(e) => isEditingProfile && setTempProfileForm({ ...tempProfileForm, username: e.target.value })}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 bg-background/50 border rounded-xl text-white text-base transition-all ${
                          isEditingProfile 
                            ? 'border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent' 
                            : 'border-border/50 cursor-not-allowed opacity-75'
                        }`}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wider">
                        <Mail className="h-4 w-4 text-primary" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={isEditingProfile ? tempProfileForm.email : profileForm.email}
                        onChange={(e) => isEditingProfile && setTempProfileForm({ ...tempProfileForm, email: e.target.value })}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 bg-background/50 border rounded-xl text-white text-base transition-all ${
                          isEditingProfile 
                            ? 'border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent' 
                            : 'border-border/50 cursor-not-allowed opacity-75'
                        }`}
                        placeholder="Enter email"
                      />
                    </div>
                    
                    {!isEditingProfile && (
                      <div className="pt-4 border-t border-border/30">
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" />
                          Click "Edit Profile" to modify your information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subscription Status Card */}
                <Card className="bg-gradient-to-br from-amber-500/5 via-card/40 to-transparent backdrop-blur-xl border-amber-500/20 shadow-2xl">
                  <CardHeader className="border-b border-amber-500/20 pb-6">
                    <CardTitle className="text-white text-xl flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Crown className="h-6 w-6 text-amber-400" />
                      </div>
                      Subscription Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-white font-bold capitalize text-2xl">{userSubscription}</p>
                          <Badge className={`px-3 py-1 text-xs font-bold uppercase ${
                            userSubscription === 'gold' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            userSubscription === 'premium' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            'bg-muted/20 text-muted-foreground border-border/30'
                          }`}>
                            {userSubscription === 'gold' ? '👑 VIP' : userSubscription === 'premium' ? '⭐ Pro' : 'Free Tier'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {userSubscription === 'free' && 'Upgrade to unlock premium features and discounts'}
                          {userSubscription === 'premium' && '20% discount on all paid events + Priority support'}
                          {userSubscription === 'gold' && '100% FREE access to all events + VIP benefits'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setSubscriptionDialogOpen(true)}
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 px-6"
                      >
                        <Crown className="h-4 w-4" />
                        Manage
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-amber-500/20">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{eventsAttended}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Events</p>
                      </div>
                      <div className="text-center border-x border-amber-500/20">
                        <p className="text-2xl font-bold text-white">{userTickets.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Tickets</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-400">
                          {userSubscription === 'gold' ? '∞' : userSubscription === 'premium' ? '20%' : '0%'}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Discount</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Payment History Section */}
            {activeSidebarSection === 'payments' && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    Payment History
                  </h2>
                  <p className="text-muted-foreground text-base">View all your transaction history and payment records</p>
                </div>

                {paymentHistory.length === 0 ? (
                  <Card className="bg-card/30 border-border border-dashed">
                    <CardContent className="p-12 text-center">
                      <Wallet className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg font-medium">No payment history yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {paymentHistory.map((payment) => (
                      <Card key={payment.id} className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-xl border ${
                                payment.type === 'Subscription' 
                                  ? 'bg-amber-500/10 border-amber-500/30' 
                                  : 'bg-primary/10 border-primary/30'
                              }`}>
                                {payment.type === 'Subscription' ? (
                                  <Crown className="h-6 w-6 text-amber-400" />
                                ) : (
                                  <TicketIcon className="h-6 w-6 text-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-white font-semibold text-lg">{payment.type}</h3>
                                <p className="text-muted-foreground text-sm">
                                  {payment.plan || payment.eventName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(payment.date).toLocaleDateString('en-IN', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">{payment.amount}</p>
                              <Badge className={`mt-2 ${
                                payment.status === 'completed' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              }`}>
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Events Attended Section */}
            {activeSidebarSection === 'attended' && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Trophy className="h-8 w-8 text-emerald-400" />
                    </div>
                    Events Attended
                  </h2>
                  <p className="text-muted-foreground text-base">Events where your tickets have been verified and used</p>
                </div>

                {userTickets.filter((t: any) => t.used).length === 0 ? (
                  <Card className="bg-card/30 border-border border-dashed">
                    <CardContent className="p-12 text-center">
                      <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg font-medium">No events attended yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {userTickets.filter((t: any) => t.used).map((ticket: any) => (
                      <Card key={ticket.id} className="bg-gradient-to-br from-emerald-500/5 to-transparent backdrop-blur-sm border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                        <CardHeader className="border-b border-emerald-500/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-white text-lg">{ticket.event_name}</CardTitle>
                              <p className="text-emerald-400 text-sm font-mono mt-1">#{ticket.event_id}</p>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              ✓ Attended
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 text-emerald-400 mr-2" />
                              <span className="text-white">
                                {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 text-emerald-400 mr-2" />
                              <span className="text-white">{ticket.event_location || 'Location TBA'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Approval Section */}
            {activeSidebarSection === 'pending' && (
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <Clock className="h-8 w-8 text-yellow-400" />
                    </div>
                    Pending Approval
                  </h2>
                  <p className="text-muted-foreground text-base">Enrollment requests awaiting organizer approval</p>
                </div>

                {userAppliedEvents.filter(id => !userAcceptedEvents.includes(id)).length === 0 ? (
                  <Card className="bg-card/30 border-border border-dashed">
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg font-medium">All enrollments have been processed!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {events.filter(e => userAppliedEvents.includes(e.event_id || e.id) && !userAcceptedEvents.includes(e.event_id || e.id)).map((event) => (
                      <Card key={event.id} className="bg-card/40 backdrop-blur-sm border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-white font-semibold text-lg">{event.name}</h3>
                              <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(event.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {event.location}
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 whitespace-nowrap">
                              ⏳ Pending
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Enrollment Dialog */}
      <Dialog open={enrollmentOpen} onOpenChange={setEnrollmentOpen}>
        <DialogContent className="bg-background border-border text-foreground overflow-hidden max-w-md">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
          <DialogHeader className="pt-4">
            <DialogTitle className="text-3xl font-bold font-bitcount">
              Request <span className="text-primary">Enrollment</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              {selectedEvent && (
                <div className="bg-muted/30 p-4 rounded-lg border border-border mt-2">
                  <p className="text-white font-bold text-lg leading-tight">{selectedEvent.name}</p>
                  <div className="flex flex-col gap-1 mt-2 text-xs uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-2"><Calendar className="w-3 h-3 text-primary" />{new Date(selectedEvent.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2"><MapPin className="w-3 h-3 text-primary" />{selectedEvent.location}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white font-bold text-xs uppercase tracking-widest flex items-center mb-1">
                <UserIcon className="mr-2 h-3.5 w-3.5 text-primary" />
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={enrollmentForm.fullName}
                onChange={(e) => setEnrollmentForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-card/50 border-border text-white placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-bold text-xs uppercase tracking-widest flex items-center mb-1">
                <Mail className="mr-2 h-3.5 w-3.5 text-primary" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={enrollmentForm.email}
                disabled
                className="bg-card/50 border-border text-white placeholder:text-muted-foreground focus:border-primary/50 opacity-75 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Using your logged-in account email
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <p className="text-xs text-primary font-medium flex items-start leading-relaxed">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Your enrollment request will be sent to the organizer for review. If approved, your ticket will appear in "All Tickets" tab.</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setEnrollmentOpen(false);
                setEnrollmentForm({ fullName: '', email: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleEnrollmentSubmit}
              disabled={!enrollmentForm.fullName || !enrollmentForm.email || enrolling}
              className="flex-1 shadow-glow shadow-primary/20"
            >
              {enrolling ? 'Sending Request...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Display Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground overflow-y-auto max-h-[90vh] max-w-md sm:max-w-lg">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary" />
          <DialogHeader className="pt-4 pb-2">
            <DialogTitle className="text-2xl sm:text-3xl font-bold font-bitcount text-center">
              <span className="text-white">Your</span> <span className="text-primary">Ticket</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm">
              📱 Show this QR code at the event entrance
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 py-2">
              {/* QR Code Display */}
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mx-auto max-w-sm">
                <div className="mb-3 text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Scan This Code</p>
                </div>
                <QRCodeDisplay
                  data={`${typeof window !== 'undefined' && window.location.origin || 'http://localhost:5000'}/verify-ticket?eventId=${selectedTicket.event_id}&ticketId=${selectedTicket.ticket_id}`}
                  title=""
                  subtitle=""
                />
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">Valid for Entry</p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="bg-gradient-to-br from-muted/40 to-muted/20 p-4 sm:p-5 rounded-xl border-2 border-border/50 space-y-4">
                <div className="text-center pb-3 border-b border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">🎫 Event Information</p>
                  <p className="text-white font-bold text-xl sm:text-2xl leading-tight">{selectedTicket.event_name}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-background/50 p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {new Date(selectedTicket.event_date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Time
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {new Date(selectedTicket.event_date).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="bg-background/50 p-3 rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location
                  </p>
                  <p className="text-white font-semibold text-sm">{selectedTicket.event_location}</p>
                </div>
                
                <div className="border-t border-border/50 pt-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Event ID</p>
                      <p className="text-emerald-400 font-mono text-xs sm:text-sm font-bold break-all">#{selectedTicket.event_id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Ticket ID</p>
                      <p className="text-purple-400 font-mono text-xs sm:text-sm font-bold break-all">{selectedTicket.ticket_id}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Holder</p>
                    <p className="text-white font-medium text-xs sm:text-sm break-all">{selectedTicket.recipient_email}</p>
                  </div>
                  {selectedTicket.unique_hash && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">🔐 Verification Hash</p>
                      <p className="text-primary/80 font-mono text-[10px] break-all bg-background/50 p-2 rounded">
                        {selectedTicket.unique_hash.slice(0, 48)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-green-400 font-medium flex items-start leading-relaxed">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-green-300">Valid Ticket:</strong> This QR code is your entry pass. It contains encrypted verification data that will be validated at the entrance.</span>
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-400 font-medium">
                  💡 <strong>Tip:</strong> Save this screen or take a screenshot for offline access
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 pb-2">
            <Button
              variant="solid"
              onClick={() => setQrDialogOpen(false)}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg"
            >
              ✓ Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Profile Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Profile Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <Trophy className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{eventsAttended}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Events Attended</p>
                </CardContent>
              </Card>
              <Card className={`border ${
                userSubscription === 'gold' ? 'bg-amber-500/10 border-amber-500/30' :
                userSubscription === 'premium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-slate-500/5 border-slate-500/20'
              }`}>
                <CardContent className="p-4 text-center">
                  <Crown className={`h-8 w-8 mx-auto mb-2 ${
                    userSubscription === 'gold' ? 'text-amber-400' :
                    userSubscription === 'premium' ? 'text-yellow-500' :
                    'text-slate-400'
                  }`} />
                  <p className="text-2xl font-bold text-white capitalize">{userSubscription}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Subscription</p>
                </CardContent>
              </Card>
            </div>

            {/* Edit Profile Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Username
                </label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email"
                />
              </div>
            </div>

            {/* Subscription Upgrade CTA */}
            {userSubscription === 'free' && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400 font-medium mb-2 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Premium or Gold
                </p>
                <p className="text-xs text-muted-foreground mb-3">Get discounts, priority access, and exclusive perks!</p>
                <Button
                  variant="solid"
                  size="sm"
                  onClick={() => {
                    setProfileDialogOpen(false);
                    setSubscriptionDialogOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  View Plans
                </Button>
              </div>
            )}

            <Button
              variant="solid"
              onClick={() => {
                // Update Supabase user metadata
                supabase.auth.updateUser({
                  data: { name: profileForm.username }
                }).then(() => {
                  toast({
                    title: "Profile Updated",
                    description: "Your profile has been updated successfully!"
                  });
                  setProfileDialogOpen(false);
                });
              }}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              Subscription Plans
            </DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 py-4">
            {/* Premium Plan */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 hover:border-yellow-500/50 transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-white mb-1">Premium</h3>
                  <div className="flex items-center justify-center gap-1 mb-4">
                    <span className="text-3xl font-bold text-yellow-500">₹799</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    10% discount on all paid events
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Priority enrollment processing
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Early access to new events
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Email support within 24 hours
                  </p>
                </div>
                <Button
                  variant="solid"
                  disabled={userSubscription !== 'free'}
                  onClick={async () => {
                    try {
                      if (!window.ethereum) {
                        toast({
                          title: "Wallet Not Found",
                          description: "Please install MetaMask to subscribe.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      const premiumFee = "0.0032"; // ~₹799
                      const provider = new ethers.BrowserProvider(window.ethereum);
                      const signer = await provider.getSigner();
                      const organizerAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
                      
                      toast({
                        title: "Processing Payment...",
                        description: `Sending ${premiumFee} ETH (₹799) for Premium subscription...`
                      });
                      
                      const tx = await signer.sendTransaction({
                        to: organizerAddress,
                        value: ethers.parseEther(premiumFee)
                      });
                      
                      toast({
                        title: "Payment Pending...",
                        description: "Waiting for transaction confirmation..."
                      });
                      
                      await tx.wait();
                      
                      setUserSubscription('premium');
                      toast({
                        title: "Welcome to Premium! 👑",
                        description: "Payment confirmed! You now have access to exclusive Premium benefits!"
                      });
                      setSubscriptionDialogOpen(false);
                    } catch (error: any) {
                      console.error('Payment error:', error);
                      toast({
                        title: "Payment Failed",
                        description: error.reason || error.message || "Failed to process payment",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {userSubscription === 'premium' ? 'Current Plan' : 'Pay 0.0032 ETH (₹799)'}
                </Button>
                {userSubscription === 'premium' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUserSubscription('free');
                      toast({
                        title: "Subscription Cancelled",
                        description: "You've been downgraded to Free tier."
                      });
                    }}
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Cancel Subscription</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Gold Plan */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border-amber-500/30 hover:border-amber-500/50 transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Zap className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-white mb-1">Gold</h3>
                  <div className="flex items-center justify-center gap-1 mb-4">
                    <span className="text-3xl font-bold text-amber-400">₹1,499</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-2 flex-shrink-0" />
                    20% discount on all paid events
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-2 flex-shrink-0" />
                    Instant enrollment approval
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-2 flex-shrink-0" />
                    Access to exclusive Gold-only events
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-2 flex-shrink-0" />
                    VIP seating at events
                  </p>
                  <p className="flex items-center text-white">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-2 flex-shrink-0" />
                    Priority 24/7 support
                  </p>
                </div>
                <Button
                  variant="solid"
                  disabled={userSubscription === 'gold'}
                  onClick={async () => {
                    try {
                      if (!window.ethereum) {
                        toast({
                          title: "Wallet Not Found",
                          description: "Please install MetaMask to subscribe.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      const goldFee = "0.006"; // ~₹1499
                      const provider = new ethers.BrowserProvider(window.ethereum);
                      const signer = await provider.getSigner();
                      const organizerAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
                      
                      toast({
                        title: "Processing Payment...",
                        description: `Sending ${goldFee} ETH (₹1,499) for Gold subscription...`
                      });
                      
                      const tx = await signer.sendTransaction({
                        to: organizerAddress,
                        value: ethers.parseEther(goldFee)
                      });
                      
                      toast({
                        title: "Payment Pending...",
                        description: "Waiting for transaction confirmation..."
                      });
                      
                      await tx.wait();
                      
                      setUserSubscription('gold');
                      toast({
                        title: "Welcome to Gold! ⚡",
                        description: "Payment confirmed! You now have access to all premium features and exclusive Gold benefits!"
                      });
                      setSubscriptionDialogOpen(false);
                    } catch (error: any) {
                      console.error('Payment error:', error);
                      toast({
                        title: "Payment Failed",
                        description: error.reason || error.message || "Failed to process payment",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {userSubscription === 'gold' ? 'Current Plan' : 'Pay 0.006 ETH (₹1,499)'}
                </Button>
                {userSubscription === 'gold' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUserSubscription('free');
                      toast({
                        title: "Subscription Cancelled",
                        description: "You've been downgraded to Free tier."
                      });
                    }}
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Cancel Subscription</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Request Dialog */}
      <Dialog open={adRequestDialogOpen} onOpenChange={setAdRequestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-amber-400" />
              Request Ad Space
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-400 font-medium mb-2">📢 Reach Thousands of Event-Goers!</p>
              <p className="text-xs text-muted-foreground">
                Fill out this form and an organizer will review your advertising request within 24-48 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Business Name</label>
                <input
                  type="text"
                  value={adRequestForm.businessName}
                  onChange={(e) => setAdRequestForm({ ...adRequestForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Your business or company name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Ad Type</label>
                <select
                  value={adRequestForm.adType}
                  onChange={(e) => setAdRequestForm({ ...adRequestForm, adType: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="banner">Banner Ad (Dashboard)</option>
                  <option value="featured">Featured Event Listing</option>
                  <option value="email">Email Promotion</option>
                  <option value="social">Social Media Shoutout</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Ad Description</label>
                <Textarea
                  value={adRequestForm.description}
                  onChange={(e) => setAdRequestForm({ ...adRequestForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="Describe what you'd like to advertise (business, product, event, etc.)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Contact Email</label>
                <input
                  type="email"
                  value={adRequestForm.contactEmail}
                  onChange={(e) => setAdRequestForm({ ...adRequestForm, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Upload Ad Image
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="ad-image-upload"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAdRequestForm({ 
                            ...adRequestForm, 
                            imageFile: file,
                            imagePreview: reader.result as string
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  
                  {adRequestForm.imagePreview ? (
                    <div className="space-y-3">
                      <img 
                        src={adRequestForm.imagePreview} 
                        alt="Ad preview" 
                        className="max-h-48 mx-auto rounded-lg border border-border"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('ad-image-upload')?.click()}
                          className="text-xs"
                        >
                          Change Image
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdRequestForm({ ...adRequestForm, imageFile: null, imagePreview: '' })}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById('ad-image-upload')?.click()}
                      className="cursor-pointer"
                    >
                      <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-white mb-1">Click to upload ad image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-400">
                💡 <strong>Tip:</strong> Pricing varies by ad type and duration. Organizers will contact you with a quote and timeline.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setAdRequestDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                onClick={async () => {
                  try {
                    // Ad request fee: 0.001 ETH (~₹250)
                    const adFee = "0.001";
                    
                    if (!window.ethereum) {
                      toast({
                        title: "Wallet Not Found",
                        description: "Please install MetaMask to submit ad requests.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    
                    // Send payment to organizer (you can set a specific organizer address)
                    const organizerAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"; // Demo organizer
                    
                    toast({
                      title: "Processing Payment...",
                      description: `Sending ${adFee} ETH (₹250) for ad request...`
                    });
                    
                    const tx = await signer.sendTransaction({
                      to: organizerAddress,
                      value: ethers.parseEther(adFee)
                    });
                    
                    toast({
                      title: "Payment Pending...",
                      description: "Waiting for transaction confirmation..."
                    });
                    
                    await tx.wait();
                    
                    // Save ad request to localStorage
                    try {
                      const existingRequests = JSON.parse(localStorage.getItem('adRequests') || '[]');
                      const newRequest = {
                        id: Date.now(),
                        business_name: adRequestForm.businessName,
                        ad_type: adRequestForm.adType,
                        description: adRequestForm.description,
                        contact_email: adRequestForm.contactEmail,
                        image_url: adRequestForm.imagePreview,
                        requested_at: new Date().toISOString(),
                        status: 'pending',
                        payment_tx: tx.hash
                      };
                      existingRequests.push(newRequest);
                      localStorage.setItem('adRequests', JSON.stringify(existingRequests));
                    } catch (error) {
                      console.error('Error saving ad request:', error);
                    }
                    
                    toast({
                      title: "Ad Request Submitted! 🎉",
                      description: "Payment confirmed! An organizer will review your request soon."
                    });
                    setAdRequestDialogOpen(false);
                    setAdRequestForm({ 
                      description: '', 
                      adType: 'banner', 
                      contactEmail: '', 
                      businessName: '',
                      imageFile: null,
                      imagePreview: ''
                    });
                  } catch (error: any) {
                    console.error('Payment error:', error);
                    toast({
                      title: "Payment Failed",
                      description: error.reason || error.message || "Failed to process payment",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!adRequestForm.description || !adRequestForm.contactEmail || !adRequestForm.businessName || !adRequestForm.imagePreview}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Pay ₹250 & Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Support Chat Button */}
      <button
        onClick={() => {
          setChatType('support');
          setChatOpen(true);
        }}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full p-4 shadow-2xl shadow-green-500/30 transition-all hover:scale-110 z-50 group"
        title="Help from Support Team"
      >
        <MessageCircle className="h-6 w-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
          !
        </span>
      </button>

      {/* Support Team Chat Dialog */}
      <Dialog open={chatOpen && chatType === 'support'} onOpenChange={(open) => { if (!open) setChatOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-green-500" />
              Support Team Chat
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Get help from our support team</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-2">
            {!supportAssigned && chatMessages.length === 1 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-400 flex items-center gap-2">
                  <Trophy className="h-4 w-4 animate-spin" />
                  <span>Support team is on the way... Please wait.</span>
                </p>
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg p-3 ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-green-500/10 border border-green-500/30'
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${
                    msg.sender === 'user' ? 'text-white/80' : 'text-green-400'
                  }`}>
                    {msg.name}
                  </p>
                  <p className="text-sm text-white">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${
                    msg.sender === 'user' ? 'text-white/60' : 'text-muted-foreground'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && chatMessage.trim()) {
                  const newMsg = {
                    id: chatMessages.length + 1,
                    sender: 'user',
                    name: 'You',
                    message: chatMessage,
                    timestamp: new Date()
                  };
                  setChatMessages([...chatMessages, newMsg]);
                  setChatMessage('');
                  
                  if (!supportAssigned) {
                    setSupportAssigned(true);
                    setTimeout(() => {
                      setChatMessages(prev => [...prev, {
                        id: prev.length + 1,
                        sender: 'support',
                        name: 'Support Team',
                        message: 'Thank you for reaching out! A support representative has been assigned to help you. How can we assist you today?',
                        timestamp: new Date()
                      }]);
                    }, 2000);
                  } else {
                    setTimeout(() => {
                      setChatMessages(prev => [...prev, {
                        id: prev.length + 1,
                        sender: 'support',
                        name: 'Support Team',
                        message: 'We\'re looking into this. Thank you for your patience!',
                        timestamp: new Date()
                      }]);
                    }, 1500);
                  }
                }
              }}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              variant="solid"
              onClick={() => {
                if (chatMessage.trim()) {
                  const newMsg = {
                    id: chatMessages.length + 1,
                    sender: 'user',
                    name: 'You',
                    message: chatMessage,
                    timestamp: new Date()
                  };
                  setChatMessages([...chatMessages, newMsg]);
                  setChatMessage('');
                  
                  if (!supportAssigned) {
                    setSupportAssigned(true);
                    setTimeout(() => {
                      setChatMessages(prev => [...prev, {
                        id: prev.length + 1,
                        sender: 'support',
                        name: 'Support Team',
                        message: 'Thank you for reaching out! A support representative has been assigned to help you. How can we assist you today?',
                        timestamp: new Date()
                      }]);
                    }, 2000);
                  } else {
                    setTimeout(() => {
                      setChatMessages(prev => [...prev, {
                        id: prev.length + 1,
                        sender: 'support',
                        name: 'Support Team',
                        message: 'We\'re looking into this. Thank you for your patience!',
                        timestamp: new Date()
                      }]);
                    }, 1500);
                  }
                }
              }}
              className="px-4 bg-green-500 hover:bg-green-600"
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Organizer Chat Dialog */}
      <Dialog open={organizerChatOpen} onOpenChange={setOrganizerChatOpen}>
        <DialogContent className="max-w-lg max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              {selectedEventForChat?.name || 'Event Organizer'} Chat
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Chat directly with the event organizer</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-2">
            {organizerMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg p-3 ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-purple-500/10 border border-purple-500/30'
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${
                    msg.sender === 'user' ? 'text-white/80' : 'text-purple-400'
                  }`}>
                    {msg.name}
                  </p>
                  <p className="text-sm text-white">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${
                    msg.sender === 'user' ? 'text-white/60' : 'text-muted-foreground'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && chatMessage.trim()) {
                  setOrganizerMessages([...organizerMessages, {
                    id: organizerMessages.length + 1,
                    sender: 'user',
                    name: 'You',
                    message: chatMessage,
                    timestamp: new Date()
                  }]);
                  setChatMessage('');
                  setTimeout(() => {
                    setOrganizerMessages(prev => [...prev, {
                      id: prev.length + 1,
                      sender: 'organizer',
                      name: selectedEventForChat?.name + ' Team',
                      message: 'Thanks for your question! We\'ll respond shortly.',
                      timestamp: new Date()
                    }]);
                  }, 1500);
                }
              }}
              placeholder="Ask about this event..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button
              variant="solid"
              onClick={() => {
                if (chatMessage.trim()) {
                  setOrganizerMessages([...organizerMessages, {
                    id: organizerMessages.length + 1,
                    sender: 'user',
                    name: 'You',
                    message: chatMessage,
                    timestamp: new Date()
                  }]);
                  setChatMessage('');
                  setTimeout(() => {
                    setOrganizerMessages(prev => [...prev, {
                      id: prev.length + 1,
                      sender: 'organizer',
                      name: selectedEventForChat?.name + ' Team',
                      message: 'Thanks for your question! We\'ll respond shortly.',
                      timestamp: new Date()
                    }]);
                  }, 1500);
                }
              }}
              className="px-4 bg-purple-500 hover:bg-purple-600"
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
