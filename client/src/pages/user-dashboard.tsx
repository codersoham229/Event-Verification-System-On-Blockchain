import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/neon-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Ticket, 
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
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeDisplay } from '@/components/qr-code-display';

interface Event {
  id: number;
  event_id?: number;
  name?: string;
  event_name?: string;
  date?: string;
  event_date?: string;
  location: string;
  description: string;
  total_tickets?: number;
  max_capacity?: number;
  available_tickets?: number;
  price?: string;
  ticket_price?: string;
  organizer_address: string;
  is_active?: boolean;
}

interface UserTicket {
  id: number;
  ticket_id: string;
  event_name: string;
  event_date: string;
  event_location: string;
  used: boolean;
  purchased_at: string;
}

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { user, signOut, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState({ fullName: '', email: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [userAppliedEvents, setUserAppliedEvents] = useState<number[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setLocation('/user-login');
      return;
    }

    fetchData();

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
      ticketsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      // Only show static demo events (organizers send tickets to selective people)
      const staticEvents = [
        {
          id: 9999,
          event_id: 9999,
          event_name: 'Tech Conference 2026',
          event_date: '2026-03-15T10:00:00Z',
          location: 'San Francisco, CA',
          description: 'Annual technology conference featuring industry leaders and innovators from around the world',
          max_capacity: 500,
          ticket_price: '0.05',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          is_active: true
        },
        {
          id: 9998,
          event_id: 9998,
          event_name: 'Web3 Summit',
          event_date: '2026-04-20T09:00:00Z',
          location: 'New York, NY',
          description: 'Exploring the future of decentralized web and blockchain technology',
          max_capacity: 300,
          ticket_price: '0.03',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          is_active: true
        },
        {
          id: 9997,
          event_id: 9997,
          event_name: 'Blockchain Expo',
          event_date: '2026-05-10T11:00:00Z',
          location: 'London, UK',
          description: 'Global blockchain technology exhibition and networking event',
          max_capacity: 1000,
          ticket_price: '0.08',
          organizer_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          is_active: true
        }
      ];

      // Only use static events
      setEvents(staticEvents as any);

      // Fetch tickets from tickets table (minted tickets)
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select(`
          *,
          events!inner(event_name, event_date, location)
        `)
        .order('created_at', { ascending: false });

      // Fetch tickets sent via email
      const { data: emailTicketsData } = await supabase
        .from('ticket_emails')
        .select('*')
        .eq('recipient_email', user?.email)
        .order('sent_at', { ascending: false });

      // Combine both ticket sources
      let allTickets: any[] = [];

      // Transform minted tickets
      if (ticketsData) {
        const transformedTickets = ticketsData.map((ticket: any) => ({
          id: ticket.id,
          ticket_id: ticket.ticket_id?.toString() || 'N/A',
          event_name: ticket.events?.event_name || 'Unknown Event',
          event_date: ticket.events?.event_date || '',
          event_location: ticket.events?.location || '',
          used: ticket.is_used || false,
          purchased_at: ticket.created_at,
          transaction_hash: ticket.transaction_hash || '',
          source: 'minted'
        }));
        allTickets = [...allTickets, ...transformedTickets];
      }

      // Transform email tickets
      if (emailTicketsData && emailTicketsData.length > 0) {
        const emailTransformedTickets = await Promise.all(
          emailTicketsData.map(async (emailTicket: any) => {
            // Fetch event details for this ticket
            const { data: eventData } = await supabase
              .from('events')
              .select('event_name, event_date, location')
              .eq('event_id', emailTicket.event_id)
              .single();

            return {
              id: emailTicket.id,
              ticket_id: emailTicket.ticket_id?.toString() || 'N/A',
              event_name: eventData?.event_name || 'Unknown Event',
              event_date: eventData?.event_date || '',
              event_location: eventData?.location || 'TBA',
              used: false,
              purchased_at: emailTicket.sent_at,
              transaction_hash: emailTicket.transaction_hash || '',
              source: 'email',
              attendee_name: emailTicket.attendee_name
            };
          })
        );
        allTickets = [...allTickets, ...emailTransformedTickets];
      }

      // Sort all tickets by date
      allTickets.sort((a, b) => 
        new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
      );

      setUserTickets(allTickets);

      // Fetch user's applied events to prevent reapplying
      const { data: appliedRequestsData } = await supabase
        .from('enrollment_requests')
        .select('event_id')
        .eq('requester_email', user?.email);

      if (appliedRequestsData) {
        setUserAppliedEvents(appliedRequestsData.map(r => r.event_id));
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
          event_name: selectedEvent.event_name || selectedEvent.name,
          organizer_address: selectedEvent.organizer_address,
          requester_email: enrollmentForm.email,
          requester_name: enrollmentForm.fullName,
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to send enrollment request:', error);
        alert('Failed to send request. Please make sure the database is set up correctly.\n\nRun this SQL in Supabase:\nsupabase-enrollment-requests-schema.sql');
      } else {
        alert('Enrollment request sent successfully! The organizer will review your request and issue a ticket if approved.');
        setEnrollmentOpen(false);
        setEnrollmentForm({ fullName: '', email: '' });
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error('Error sending enrollment request:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  BlockTix
                </h1>
                <p className="text-xs text-slate-400">User Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-indigo-600/20 border-indigo-400/50 text-indigo-300 px-3 py-1">
                <UserCircle className="mr-1.5 h-4 w-4" />
                {user?.user_metadata?.name || user?.email}
              </Badge>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-slate-700 text-slate-300 hover:text-white hover:border-red-500"
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
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Tickets Issued</p>
                  <p className="text-3xl font-bold text-white mt-1">{userTickets.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                  <Ticket className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Available Tickets</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {userTickets.filter((t: any) => !t.used).length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <Star className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Available Events</p>
                  <p className="text-3xl font-bold text-white mt-1">{events.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="events" className="data-[state=active]:bg-indigo-600">
              <Calendar className="mr-2 h-4 w-4" />
              Available Events
            </TabsTrigger>
            <TabsTrigger value="tickets" className="data-[state=active]:bg-indigo-600">
              <QrCode className="mr-2 h-4 w-4" />
              All Tickets
            </TabsTrigger>
          </TabsList>

          {/* Available Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {events.length === 0 ? (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No events available at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {events.map((event) => (
                  <Card key={event.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:border-indigo-500/50 transition-all flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2">
                            {event.name || event.event_name}
                          </CardTitle>
                          <CardDescription className="text-slate-400 line-clamp-2 min-h-[40px]">
                            {event.description}
                          </CardDescription>
                        </div>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 whitespace-nowrap">
                          {event.price || event.ticket_price} ETH
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center text-slate-300 text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-blue-400" />
                          <span className="font-medium">Date:</span>
                          <span className="ml-1">
                            {new Date(event.date || event.event_date || '').toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <Clock className="mr-2 h-4 w-4 text-orange-400" />
                          <span className="font-medium">Time:</span>
                          <span className="ml-1">
                            {new Date(event.date || event.event_date || '').toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <MapPin className="mr-2 h-4 w-4 text-green-400" />
                          <span className="font-medium">Location:</span>
                          <span className="ml-1">{event.location}</span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <Ticket className="mr-2 h-4 w-4 text-purple-400" />
                          <span className="font-medium">Capacity:</span>
                          <span className="ml-1">
                            {event.max_capacity || event.total_tickets || 'Unlimited'} spots
                          </span>
                        </div>
                      </div>
                      
                      {userAppliedEvents.includes(event.event_id || event.id) ? (
                        <Button 
                          disabled
                          className="w-full bg-slate-600 text-slate-400 cursor-not-allowed"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Already Applied
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleEnrollClick(event)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                        >
                          <UserIcon className="mr-2 h-4 w-4" />
                          Request Enrollment
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
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
                <CardContent className="p-12 text-center">
                  <QrCode className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No tickets have been issued yet</p>
                  <p className="text-slate-500 text-sm mt-2">Tickets will appear here when organizers create them</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {userTickets.map((ticket: any) => (
                  <Card key={ticket.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:border-indigo-500/50 transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white mb-1">{ticket.event_name}</CardTitle>
                          {ticket.attendee_name && (
                            <p className="text-sm text-slate-400">Attendee: {ticket.attendee_name}</p>
                          )}
                        </div>
                        <Badge variant={ticket.used ? "secondary" : "default"} className={ticket.used ? "bg-slate-600" : "bg-green-600"}>
                          {ticket.used ? "Used" : "Available"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-slate-300 text-sm">
                          <span className="text-slate-400">Ticket ID:</span>
                          <span className="font-mono font-semibold text-indigo-300">{ticket.ticket_id}</span>
                        </div>
                        <Separator className="bg-slate-700/50" />
                        <div className="flex items-center text-slate-300 text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-blue-400" />
                          <span className="text-slate-400">Date:</span>
                          <span className="ml-auto">{ticket.event_date ? new Date(ticket.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}</span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <MapPin className="mr-2 h-4 w-4 text-green-400" />
                          <span className="text-slate-400">Location:</span>
                          <span className="ml-auto">{ticket.event_location || 'TBA'}</span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <History className="mr-2 h-4 w-4 text-purple-400" />
                          <span className="text-slate-400">Issued:</span>
                          <span className="ml-auto">{new Date(ticket.purchased_at).toLocaleDateString()}</span>
                        </div>
                        {ticket.transaction_hash && (
                          <div className="flex items-center text-slate-300 text-sm">
                            <LinkIcon className="mr-2 h-4 w-4 text-cyan-400" />
                            <span className="text-slate-400">Blockchain:</span>
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${ticket.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs"
                            >
                              {ticket.transaction_hash.slice(0, 6)}...{ticket.transaction_hash.slice(-4)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {ticket.source && (
                          <div className="flex items-center text-slate-300 text-sm">
                            <Star className="mr-2 h-4 w-4 text-yellow-400" />
                            <span className="text-slate-400">Source:</span>
                            <span className="ml-auto capitalize">{ticket.source}</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setQrDialogOpen(true);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
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
      </main>

      {/* Enrollment Dialog */}
      <Dialog open={enrollmentOpen} onOpenChange={setEnrollmentOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Enroll in Event
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedEvent && (
                <div className="mt-2 space-y-1">
                  <p className="text-white font-semibold text-lg">
                    {selectedEvent.name || selectedEvent.event_name}
                  </p>
                  <p className="text-sm">
                    {new Date(selectedEvent.date || selectedEvent.event_date || '').toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm">{selectedEvent.location}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white font-medium flex items-center">
                <UserIcon className="mr-2 h-4 w-4 text-blue-400" />
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={enrollmentForm.fullName}
                onChange={(e) => setEnrollmentForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium flex items-center">
                <Mail className="mr-2 h-4 w-4 text-purple-400" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={enrollmentForm.email}
                onChange={(e) => setEnrollmentForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-indigo-300 flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>After submitting your request, the event organizer will review it. If approved, you'll receive a ticket via email that will appear in your "All Tickets" section.</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setEnrollmentOpen(false);
                setEnrollmentForm({ fullName: '', email: '' });
              }}
              className="flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnrollmentSubmit}
              disabled={enrolling || !enrollmentForm.fullName || !enrollmentForm.email}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {enrolling ? (
                <>
                  <span className="animate-pulse">Sending Request...</span>
                </>
              ) : (
                <>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Your Ticket QR Code
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedTicket && (
                <div className="mt-2">
                  <p className="text-white font-semibold text-lg">{selectedTicket.event_name}</p>
                  <p className="text-sm">Ticket ID: {selectedTicket.ticket_id}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <QRCodeDisplay
                data={JSON.stringify({
                  eventId: selectedTicket.event_id || 'N/A',
                  ticketId: selectedTicket.ticket_id,
                  email: selectedTicket.owner || user?.email
                })}
                title=""
                subtitle=""
              />
              <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-lg p-4 text-sm space-y-2">
                <p className="text-slate-300">
                  <span className="text-slate-400">Event:</span> {selectedTicket.event_name}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Date:</span> {selectedTicket.event_date ? new Date(selectedTicket.event_date).toLocaleDateString() : 'TBA'}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Location:</span> {selectedTicket.event_location || 'TBA'}
                </p>
              </div>
              <Button
                onClick={() => setQrDialogOpen(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
