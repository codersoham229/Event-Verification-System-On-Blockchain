import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  TrendingUp,
  Users,
  Ticket,
  DollarSign,
  Calendar,
  Activity,
  Shield,
  Clock,
  Award,
  AlertCircle,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  UserPlus,
  Mail
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  total_events: number;
  total_tickets_minted: number;
  tickets_approved: number;
  tickets_used: number;
  tickets_sent: number;
  total_revenue: number;
  total_enrollments: number;
  pending_enrollments: number;
  approved_enrollments: number;
}

interface EventWithTickets {
  id: number;
  name: string;
  description: string;
  date: string;
  location: string;
  total_tickets: number;
  available_tickets: number;
  price: string;
  organizer_address: string;
  transaction_hash: string;
  is_public: boolean;
  created_at: string;
  tickets_minted: number;
  tickets_used: number;
  tickets_approved: number;
}

interface RecentActivity {
  id: string;
  type: 'event_created' | 'ticket_minted' | 'ticket_used' | 'enrollment_request' | 'enrollment_approved';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_events: 0,
    total_tickets_minted: 0,
    tickets_approved: 0,
    tickets_used: 0,
    tickets_sent: 0,
    total_revenue: 0,
    total_enrollments: 0,
    pending_enrollments: 0,
    approved_enrollments: 0,
  });
  const [events, setEvents] = useState<EventWithTickets[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      // 1. Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      const allEvents = eventsData || [];

      // 2. Fetch all ticket_emails
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      const allTickets = ticketsData || [];

      // 3. Fetch all enrollment_requests
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;
      const allEnrollments = enrollmentsData || [];

      // Calculate stats
      const totalTickets = allTickets.length;
      const ticketsApproved = allTickets.filter((t: any) => t.status === 'approved').length;
      const ticketsUsed = allTickets.filter((t: any) => t.status === 'used').length;
      const ticketsSent = allTickets.filter((t: any) => t.status === 'sent').length;

      // Calculate revenue: sum of (event price * tickets minted for that event)
      let totalRevenue = 0;
      allEvents.forEach((event: any) => {
        const eventTickets = allTickets.filter((t: any) => t.event_id === event.id || t.event_id === event.event_id);
        const price = parseFloat(event.price || event.ticket_price || '0');
        totalRevenue += price * eventTickets.length;
      });

      const totalEnrollments = allEnrollments.length;
      const pendingEnrollments = allEnrollments.filter((e: any) => e.status === 'pending').length;
      const approvedEnrollments = allEnrollments.filter((e: any) => e.status === 'approved').length;

      setStats({
        total_events: allEvents.length,
        total_tickets_minted: totalTickets,
        tickets_approved: ticketsApproved,
        tickets_used: ticketsUsed,
        tickets_sent: ticketsSent,
        total_revenue: totalRevenue,
        total_enrollments: totalEnrollments,
        pending_enrollments: pendingEnrollments,
        approved_enrollments: approvedEnrollments,
      });

      // Build events with ticket counts
      const eventsWithTickets: EventWithTickets[] = allEvents.map((event: any) => {
        const eventTickets = allTickets.filter((t: any) => t.event_id === event.id || t.event_id === event.event_id);
        return {
          id: event.id || event.event_id,
          name: event.name || event.event_name || 'Unnamed Event',
          description: event.description || '',
          date: event.date || event.event_date || event.created_at,
          location: event.location || 'N/A',
          total_tickets: event.total_tickets || event.max_capacity || 0,
          available_tickets: event.available_tickets || 0,
          price: event.price || event.ticket_price || '0',
          organizer_address: event.organizer_address || '',
          transaction_hash: event.transaction_hash || '',
          is_public: event.is_public ?? true,
          created_at: event.created_at,
          tickets_minted: eventTickets.length,
          tickets_used: eventTickets.filter((t: any) => t.status === 'used').length,
          tickets_approved: eventTickets.filter((t: any) => t.status === 'approved').length,
        };
      });
      setEvents(eventsWithTickets);

      // Build recent activity feed
      const activityFeed: RecentActivity[] = [];

      // Add event creations
      allEvents.forEach((event: any) => {
        activityFeed.push({
          id: `event-${event.id}`,
          type: 'event_created',
          title: event.name || event.event_name || 'New Event',
          description: `Event created at ${event.location || 'N/A'}`,
          timestamp: event.created_at,
        });
      });

      // Add ticket mints
      allTickets.forEach((ticket: any) => {
        const event = allEvents.find((e: any) => e.id === ticket.event_id || e.event_id === ticket.event_id);
        activityFeed.push({
          id: `ticket-${ticket.id}`,
          type: ticket.status === 'used' ? 'ticket_used' : 'ticket_minted',
          title: event?.name || event?.event_name || `Event #${ticket.event_id}`,
          description: `Ticket ${ticket.status === 'used' ? 'used by' : 'minted for'} ${ticket.recipient_email}`,
          timestamp: ticket.created_at,
        });
      });

      // Add enrollment requests
      allEnrollments.forEach((enrollment: any) => {
        activityFeed.push({
          id: `enrollment-${enrollment.id}`,
          type: enrollment.status === 'approved' ? 'enrollment_approved' : 'enrollment_request',
          title: enrollment.event_name || `Event #${enrollment.event_id}`,
          description: `${enrollment.requester_name || enrollment.requester_email} - ${enrollment.status}`,
          timestamp: enrollment.created_at,
        });
      });

      // Sort by timestamp descending
      activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(activityFeed.slice(0, 50));
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscriptions for live updates
    const eventsChannel = supabase
      .channel('dashboard-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        console.log('Events table changed — refreshing dashboard');
        fetchDashboardData();
      })
      .subscribe();

    const ticketsChannel = supabase
      .channel('dashboard-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_emails' }, () => {
        console.log('Tickets table changed — refreshing dashboard');
        fetchDashboardData();
      })
      .subscribe();

    const enrollmentsChannel = supabase
      .channel('dashboard-enrollments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_requests' }, () => {
        console.log('Enrollments table changed — refreshing dashboard');
        fetchDashboardData();
      })
      .subscribe();

    // Auto-refresh every 30 seconds as a safety net
    const refreshInterval = setInterval(fetchDashboardData, 30000);

    return () => {
      eventsChannel.unsubscribe();
      ticketsChannel.unsubscribe();
      enrollmentsChannel.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [fetchDashboardData]);

  const formatCurrency = (value: number) => `${value.toFixed(4)} ETH`;
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return 'N/A'; }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'event_created': return <Calendar className="h-5 w-5 text-primary" />;
      case 'ticket_minted': return <Ticket className="h-5 w-5 text-green-400" />;
      case 'ticket_used': return <CheckCircle2 className="h-5 w-5 text-amber-400" />;
      case 'enrollment_request': return <UserPlus className="h-5 w-5 text-blue-400" />;
      case 'enrollment_approved': return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'event_created': return { label: 'Event Created', className: 'bg-primary/10 text-primary border-primary/20' };
      case 'ticket_minted': return { label: 'Ticket Minted', className: 'bg-green-500/10 text-green-400 border-green-500/20' };
      case 'ticket_used': return { label: 'Ticket Used', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'enrollment_request': return { label: 'Enrollment', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'enrollment_approved': return { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      default: return { label: type, className: 'bg-muted-foreground/10 text-muted-foreground border-border' };
    }
  };

  if (loading && stats.total_events === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground font-medium">Loading live analytics...</p>
      </div>
    );
  }

  if (error && stats.total_events === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-semibold text-white flex items-center gap-3 font-bitcount tracking-normal">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-2">
              Live data from your events, tickets &amp; enrollments
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button onClick={fetchDashboardData} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow shadow-primary/20">
              <Activity className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid - 4 main cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{stats.total_events}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-green-400">
                <ArrowUpRight className="h-3 w-3" />
                <span>Events created on blockchain</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tickets Minted</CardTitle>
              <Ticket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{stats.total_tickets_minted}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                <span>{stats.tickets_used} used · {stats.tickets_approved} approved</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{formatCurrency(stats.total_revenue)}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-green-400">
                <TrendingUp className="h-3 w-3" />
                <span>From ticket sales</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enrollments</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{stats.total_enrollments}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-primary">
                <Award className="h-3 w-3" />
                <span>{stats.pending_enrollments} pending · {stats.approved_enrollments} approved</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-card/50 border border-border p-1 gap-1 w-full lg:w-auto h-auto">
            <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest">Events</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest">Activity Feed</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest">Analytics</TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card className="bg-card/40 border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Event Performance
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time overview of all your events and ticket data
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {events.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                        <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No events found. Create your first event to get started!</p>
                      </div>
                    ) : (
                      events.map((event) => {
                        const capacityPct = event.total_tickets > 0 
                          ? Math.round((event.tickets_minted / event.total_tickets) * 100) 
                          : 0;
                        return (
                          <Card key={event.id} className="bg-background/40 border-border hover:border-primary/50 transition-all group overflow-hidden shadow-glow shadow-primary/5">
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">{event.name}</h3>
                                  <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span className="flex items-center gap-2">
                                      <Calendar className="h-3.5 w-3.5 text-primary" />
                                      {formatDate(event.date)}
                                    </span>
                                    {event.location && (
                                      <span className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                        {event.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="inline-flex px-4 py-2 bg-primary/20 border border-primary/30 rounded-full text-primary font-bold text-sm shadow-glow shadow-primary/10">
                                  {event.price} ETH / ticket
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 bg-primary/5 border border-primary/10 rounded-xl group-hover:bg-primary/10 transition-colors">
                                  <div className="text-3xl font-semibold text-primary font-bitcount tracking-normal mb-1">{event.tickets_minted}</div>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Minted</div>
                                </div>
                                <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-xl group-hover:bg-green-500/10 transition-colors">
                                  <div className="text-3xl font-semibold text-green-400 font-bitcount tracking-normal mb-1">{event.tickets_approved}</div>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Approved</div>
                                </div>
                                <div className="text-center p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl group-hover:bg-amber-500/10 transition-colors">
                                  <div className="text-3xl font-semibold text-amber-400 font-bitcount tracking-normal mb-1">{event.tickets_used}</div>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Used</div>
                                </div>
                                <div className="text-center p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl group-hover:bg-blue-500/10 transition-colors">
                                  <div className="text-3xl font-semibold text-blue-400 font-bitcount tracking-normal mb-1">{event.total_tickets}</div>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Max Cap</div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <span>Capacity Utilization</span>
                                  <span className="text-primary">{capacityPct}%</span>
                                </div>
                                <Progress value={capacityPct} className="h-1.5 bg-muted border border-border" />
                              </div>

                              {event.transaction_hash && (
                                <>
                                  <Separator className="my-6 border-border/50" />
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                        <Shield className="h-4 w-4 text-primary" />
                                      </div>
                                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                        On-chain: {event.transaction_hash.slice(0, 10)}...{event.transaction_hash.slice(-6)}
                                      </span>
                                    </div>
                                    <a
                                      href={`https://sepolia.etherscan.io/tx/${event.transaction_hash}`}
                                      target="_blank" rel="noopener noreferrer"
                                    >
                                      <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-widest text-white hover:text-primary hover:bg-primary/10 border border-border">
                                        <Eye className="h-3.5 w-3.5 mr-2" />
                                        Etherscan
                                      </Button>
                                    </a>
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Feed Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="bg-card/40 border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                  <Activity className="h-5 w-5 text-primary" />
                  Live Activity Feed
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time log of all events, tickets, and enrollment activity
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                        <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No activity yet. Actions will appear here in real-time.</p>
                      </div>
                    ) : (
                      activities.map((activity) => {
                        const badge = getActivityBadge(activity.type);
                        return (
                          <div key={activity.id} className="flex items-center justify-between p-5 bg-background/40 border border-border rounded-xl hover:border-primary/50 transition-all hover:bg-card/20 group">
                            <div className="flex items-center gap-5 flex-1">
                              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform shadow-glow shadow-primary/5">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-bold text-white text-base">{activity.title}</span>
                                  <Badge variant="outline" className={`${badge.className} font-bold text-[10px] uppercase tracking-widest`}>
                                    {badge.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <span>{activity.description}</span>
                                  <span className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    {formatDate(activity.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Ticket Status Breakdown */}
              <Card className="bg-card/40 border-border">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                    <Shield className="h-5 w-5 text-primary" />
                    Ticket Status Breakdown
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Live ticket status overview</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground font-medium">Tickets Used</span>
                        <span className="text-amber-400">{stats.total_tickets_minted > 0 ? Math.round((stats.tickets_used / stats.total_tickets_minted) * 100) : 0}%</span>
                      </div>
                      <Progress value={stats.total_tickets_minted > 0 ? (stats.tickets_used / stats.total_tickets_minted) * 100 : 0} className="h-2.5 bg-muted" />
                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                        <span>{stats.tickets_used} used</span>
                        <span>{stats.total_tickets_minted} total minted</span>
                      </div>
                    </div>
                    <Separator className="border-border/50" />
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground font-medium">Tickets Approved</span>
                        <span className="text-green-400">{stats.total_tickets_minted > 0 ? Math.round((stats.tickets_approved / stats.total_tickets_minted) * 100) : 0}%</span>
                      </div>
                      <Progress value={stats.total_tickets_minted > 0 ? (stats.tickets_approved / stats.total_tickets_minted) * 100 : 0} className="h-2.5 bg-muted" />
                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                        <span>{stats.tickets_approved} approved</span>
                        <span>{stats.total_tickets_minted} total minted</span>
                      </div>
                    </div>
                    <Separator className="border-border/50" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-5 bg-green-500/10 border border-green-500/20 rounded-xl shadow-glow shadow-green-500/5">
                        <Ticket className="h-8 w-8 text-green-400 mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-green-400 font-bitcount tracking-normal mb-1">{stats.tickets_sent}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Sent</div>
                      </div>
                      <div className="text-center p-5 bg-primary/10 border border-primary/20 rounded-xl shadow-glow shadow-primary/5">
                        <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-primary font-bitcount tracking-normal mb-1">{stats.tickets_approved}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Approved</div>
                      </div>
                      <div className="text-center p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Clock className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-amber-400 font-bitcount tracking-normal mb-1">{stats.tickets_used}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Used</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enrollment Analytics */}
              <Card className="bg-card/40 border-border">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                    <Users className="h-5 w-5 text-primary" />
                    Enrollment Analytics
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">User enrollment request overview</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground font-medium">Approval Rate</span>
                        <span className="text-primary">{stats.total_enrollments > 0 ? Math.round((stats.approved_enrollments / stats.total_enrollments) * 100) : 0}%</span>
                      </div>
                      <Progress value={stats.total_enrollments > 0 ? (stats.approved_enrollments / stats.total_enrollments) * 100 : 0} className="h-2.5 bg-muted" />
                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                        <span>{stats.approved_enrollments} approved</span>
                        <span>{stats.total_enrollments} total requests</span>
                      </div>
                    </div>
                    <Separator className="border-border/50" />
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <UserPlus className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-yellow-400 font-bitcount tracking-normal mb-1">{stats.pending_enrollments}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-glow shadow-emerald-500/5">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-emerald-400 font-bitcount tracking-normal mb-1">{stats.approved_enrollments}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Approved</div>
                      </div>
                    </div>

                    <Separator className="border-border/50" />

                    {/* Per-Event Breakdown */}
                    <div>
                      <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Per-Event Tickets</h4>
                      <div className="space-y-4">
                        {events.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
                        ) : (
                          events.slice(0, 5).map((event) => {
                            const pct = event.total_tickets > 0 ? Math.round((event.tickets_minted / event.total_tickets) * 100) : 0;
                            return (
                              <div key={event.id} className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                                  <span className="text-muted-foreground truncate max-w-[200px]">{event.name}</span>
                                  <span className="text-white">{event.tickets_minted}/{event.total_tickets}</span>
                                </div>
                                <Progress value={pct} className="h-2 bg-muted" />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-card/40 backdrop-blur-sm border-primary/20 shadow-glow shadow-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-full border border-primary/30">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm uppercase tracking-widest">Live Data Connected</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Dashboard auto-updates when events are created, tickets minted/used, or enrollments change
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 px-6 py-1.5 font-bold uppercase tracking-widest text-[10px]">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                  Realtime Active
                </Badge>
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">
                  {stats.total_events} Events · {stats.total_tickets_minted} Tickets
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
