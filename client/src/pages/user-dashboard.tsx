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
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string;
  total_tickets: number;
  available_tickets: number;
  price: string;
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
  const { user, signOut } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState({ fullName: '', email: '' });
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
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
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch available events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (eventsData) setEvents(eventsData);

      // Fetch all tickets (issued by organizers)
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select(`
          *,
          events!inner(name, date, location)
        `)
        .order('created_at', { ascending: false });

      if (ticketsData) {
        // Transform the data to match our interface
        const transformedTickets = ticketsData.map((ticket: any) => ({
          id: ticket.id,
          ticket_id: ticket.ticket_id,
          event_name: ticket.events?.name || 'Unknown Event',
          event_date: ticket.events?.date || '',
          event_location: ticket.events?.location || '',
          used: ticket.used || false,
          purchased_at: ticket.created_at,
          owner: ticket.owner
        }));
        setUserTickets(transformedTickets as any);
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
      // Generate unique ticket ID
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create ticket in database
      const { error } = await supabase
        .from('tickets')
        .insert({
          ticket_id: ticketId,
          event_id: selectedEvent.id,
          owner: enrollmentForm.email,
          attendee_name: enrollmentForm.fullName,
          used: false
        });

      if (error) {
        console.error('Failed to create ticket:', error);
        alert('Failed to enroll. Please try again.');
      } else {
        // Update available tickets
        await supabase
          .from('events')
          .update({ available_tickets: selectedEvent.available_tickets - 1 })
          .eq('id', selectedEvent.id);

        alert('Successfully enrolled! Your ticket is now available in "All Tickets" tab.');
        setEnrollmentOpen(false);
        setEnrollmentForm({ fullName: '', email: '' });
        setSelectedEvent(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error enrolling:', error);
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
                  <Card key={event.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:border-indigo-500/50 transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2">{event.name}</CardTitle>
                          <CardDescription className="text-slate-400 line-clamp-2">{event.description}</CardDescription>
                        </div>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1">
                          ${event.price}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-slate-300 text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-blue-400" />
                          <span className="font-medium">Date:</span>
                          <span className="ml-1">{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <Clock className="mr-2 h-4 w-4 text-orange-400" />
                          <span className="font-medium">Time:</span>
                          <span className="ml-1">{new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <MapPin className="mr-2 h-4 w-4 text-green-400" />
                          <span className="font-medium">Location:</span>
                          <span className="ml-1">{event.location}</span>
                        </div>
                        <div className="flex items-center text-slate-300 text-sm">
                          <Ticket className="mr-2 h-4 w-4 text-purple-400" />
                          <span className="font-medium">Availability:</span>
                          <span className="ml-1">{event.available_tickets} / {event.total_tickets} tickets</span>
                        </div>
                      </div>
                      
                      {event.available_tickets > 0 ? (
                        <Button 
                          onClick={() => handleEnrollClick(event)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                        >
                          <UserIcon className="mr-2 h-4 w-4" />
                          Enroll Now
                        </Button>
                      ) : (
                        <Button disabled className="w-full bg-slate-700 text-slate-400">
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
                        <CardTitle className="text-white">{ticket.event_name}</CardTitle>
                        <Badge variant={ticket.used ? "secondary" : "default"} className={ticket.used ? "bg-slate-600" : "bg-green-600"}>
                          {ticket.used ? "Used" : "Available"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-slate-300 text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-blue-400" />
                        {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'TBA'}
                      </div>
                      <div className="flex items-center text-slate-300 text-sm">
                        <MapPin className="mr-2 h-4 w-4 text-green-400" />
                        {ticket.event_location || 'Location TBA'}
                      </div>
                      <div className="flex items-center text-slate-300 text-sm">
                        <QrCode className="mr-2 h-4 w-4 text-purple-400" />
                        Ticket ID: {ticket.ticket_id}
                      </div>
                      {ticket.owner && (
                        <div className="flex items-center text-slate-300 text-sm">
                          <UserCircle className="mr-2 h-4 w-4 text-yellow-400" />
                          Owner: {ticket.owner}
                        </div>
                      )}
                      <Button variant="outline" className="w-full border-slate-700 text-white hover:border-indigo-500">
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
                  <p className="text-white font-semibold text-lg">{selectedEvent.name}</p>
                  <p className="text-sm">{new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-300 flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>After confirming, your ticket will be generated and available in the "All Tickets" tab. You'll receive a unique ticket ID for verification.</span>
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
              className="flex-1 border-slate-700 text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnrollmentSubmit}
              disabled={!enrollmentForm.fullName || !enrollmentForm.email || enrolling}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
