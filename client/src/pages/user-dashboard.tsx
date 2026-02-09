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
                <Ticket className="h-6 w-6 text-primary" />
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
              <Badge variant="outline" className="bg-primary/5 border-primary/30 text-primary px-3 py-1">
                <UserCircle className="mr-1.5 h-4 w-4" />
                {user?.user_metadata?.name || user?.email}
              </Badge>
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
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Tickets Issued</p>
                  <p className="text-4xl font-semibold text-white mt-1 font-bitcount tracking-normal">{userTickets.length}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-glow shadow-primary/5">
                  <Ticket className="h-8 w-8 text-primary" />
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

          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Available Events</p>
                  <p className="text-4xl font-semibold text-white mt-1 font-bitcount tracking-normal">{events.length}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-glow shadow-primary/5">
                  <TrendingUp className="h-8 w-8 text-primary" />
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
                {events.map((event) => (
                  <Card key={event.id} className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 group">
                    <CardHeader className="border-b border-border/50 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2 group-hover:text-primary transition-colors">{event.name}</CardTitle>
                          <CardDescription className="text-muted-foreground line-clamp-2">{event.description}</CardDescription>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 font-bold">
                          ${event.price}
                        </Badge>
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
                          <Ticket className="mr-2 h-4 w-4 text-primary" />
                          <span>{event.available_tickets} / {event.total_tickets} Available</span>
                        </div>
                      </div>

                      {event.available_tickets > 0 ? (
                        <Button
                          variant="solid"
                          onClick={() => handleEnrollClick(event)}
                          className="w-full shadow-glow shadow-primary/10"
                        >
                          <UserIcon className="mr-2 h-4 w-4" />
                          Enroll Now
                        </Button>
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
                        <CardTitle className="text-white group-hover:text-primary transition-colors">{ticket.event_name}</CardTitle>
                        <Badge className={`${ticket.used
                          ? 'bg-muted text-muted-foreground border-border'
                          : 'bg-primary/20 text-primary border-primary/30'} px-3 py-1 font-bold`}>
                          {ticket.used ? "Used" : "Valid"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-widest font-bold text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-primary" />
                          {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'TBA'}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-primary" />
                          <span className="truncate">{ticket.event_location || 'Location TBA'}</span>
                        </div>
                        <div className="flex items-center col-span-2 font-mono text-primary/80 lowercase">
                          <QrCode className="mr-2 h-4 w-4 text-primary" />
                          ID: {ticket.ticket_id}
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
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
        <DialogContent className="bg-background border-border text-foreground overflow-hidden max-w-md">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
          <DialogHeader className="pt-4">
            <DialogTitle className="text-3xl font-bold font-bitcount">
              Enroll in <span className="text-primary">Event</span>
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
                onChange={(e) => setEnrollmentForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-card/50 border-border text-white placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <p className="text-xs text-primary font-medium flex items-start leading-relaxed">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>After confirming, your ticket will be generated and available in the "All Tickets" tab. You'll receive a unique ticket ID for verification on the blockchain.</span>
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
              {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
