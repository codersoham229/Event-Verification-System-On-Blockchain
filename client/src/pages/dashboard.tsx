import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ArrowDownRight,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  Moon,
  Sun,
  UserPlus,
  Mail,
  Check,
  X
} from 'lucide-react';
import { supabase, type TicketTransaction, type EventAnalytics } from '@/lib/supabase';
import { contractService } from '@/lib/contract';

interface DashboardStats {
  total_events: number;
  total_tickets: number;
  verified_tickets: number;
  used_tickets: number;
  total_revenue: number;
  total_users: number;
  new_users_week: number;
}

interface EventPerformance {
  event_id: string;
  event_name: string;
  date: string;
  events_created: number;
  tickets_sold: number;
  revenue: number;
  max_capacity: number;
  attendees: Array<{wallet: string, name: string, timestamp: string}>;
}

interface EnrollmentRequest {
  id: number;
  event_id: number;
  event_name: string;
  requester_email: string;
  requester_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventAnalytics[]>([]);
  const [transactions, setTransactions] = useState<TicketTransaction[]>([]);
  const [performance, setPerformance] = useState<EventPerformance[]>([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventPerformance | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to real-time updates for both events and tickets
    const eventsSubscription = supabase
      .channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    const ticketsSubscription = supabase
      .channel('tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    const requestsSubscription = supabase
      .channel('enrollment_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_requests' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      ticketsSubscription.unsubscribe();
      requestsSubscription.unsubscribe();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats from actual tables
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventsError) {
        console.error('Events fetch error:', eventsError);
      }

      const { data: allTicketsData, error: allTicketsError } = await supabase
        .from('tickets')
        .select('*');

      if (allTicketsError) {
        console.error('Tickets fetch error:', allTicketsError);
      }

      // Calculate stats from the data
      const totalTickets = allTicketsData?.length || 0;
      const verifiedTickets = allTicketsData?.filter(t => t.is_used).length || 0;
      const totalRevenue = allTicketsData?.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0) || 0;

      setStats({
        total_events: eventsData?.length || 0,
        total_tickets: totalTickets,
        verified_tickets: verifiedTickets,
        used_tickets: verifiedTickets,
        total_revenue: totalRevenue,
        total_users: new Set(allTicketsData?.map(t => t.attendee_wallet)).size || 0,
        new_users_week: 0
      });

      // Transform events data for display
      const eventAnalytics = (eventsData || []).map(event => ({
        event_id: event.event_id,
        event_name: event.event_name,
        event_date: event.event_date,
        location: event.location || 'TBA',
        max_capacity: event.max_capacity || 0,
        ticket_price: (parseFloat(event.ticket_price) || 0).toString(),
        tickets_sold: allTicketsData?.filter(t => t.event_id === event.event_id).length || 0,
        tickets_verified: allTicketsData?.filter(t => t.event_id === event.event_id && t.is_used).length || 0,
        tickets_used: allTicketsData?.filter(t => t.event_id === event.event_id && t.is_used).length || 0,
        revenue: allTicketsData?.filter(t => t.event_id === event.event_id)
          .reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0) || 0,
        capacity_percentage: ((allTicketsData?.filter(t => t.event_id === event.event_id).length || 0) / (event.max_capacity || 1) * 100).toFixed(1),
        created_at: event.created_at,
        organizer_address: event.organizer_address
      }));

      setEvents(eventAnalytics);

      // Fetch recent transactions from tickets table with event names
      const { data: recentTicketsData, error: recentTicketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          events!inner(event_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentTicketsError) {
        console.error('Tickets error:', recentTicketsError);
      }
      
      // Transform tickets to transaction format
      const transactionsData: TicketTransaction[] = (recentTicketsData || []).map(ticket => ({
        id: ticket.id,
        event_id: ticket.event_id || '',
        action: ticket.is_used ? 'verified' : 'minted',
        event_name: ticket.events?.event_name || 'Unknown Event',
        ticket_id: ticket.token_id?.toString() || ticket.ticket_id?.toString() || '',
        owner_address: ticket.attendee_wallet || ticket.owner_address || '',
        transaction_hash: ticket.transaction_hash || '',
        timestamp: ticket.created_at,
        price: ticket.price || '0'
      }));
      
      setTransactions(transactionsData);

      // Fetch performance data with attendee details
      const performanceData: EventPerformance[] = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: eventTickets } = await supabase
            .from('tickets')
            .select('*')
            .eq('event_id', event.event_id);

          const attendees = (eventTickets || []).map(ticket => ({
            wallet: ticket.attendee_wallet || ticket.owner_address || '',
            name: ticket.attendee_name || 'Anonymous',
            timestamp: ticket.created_at
          }));

          return {
            event_id: event.event_id,
            event_name: event.event_name,
            date: event.event_date || event.created_at,
            events_created: 1,
            tickets_sold: eventTickets?.length || 0,
            revenue: eventTickets?.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0) || 0,
            max_capacity: event.max_capacity || 0,
            attendees
          };
        })
      );
      
      setPerformance(performanceData);

      // Fetch enrollment requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('enrollment_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (requestsError) {
        console.error('Enrollment requests fetch error:', requestsError);
      } else {
        setEnrollmentRequests(requestsData || []);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: EnrollmentRequest) => {
    setProcessingRequest(request.id);
    try {
      // Step 1: Mint ticket on blockchain
      console.log('🎫 Minting blockchain ticket for:', request.requester_name);
      
      let blockchainTicketId = '';
      let transactionHash = '';
      
      try {
        const mintResult = await contractService.mintTicket(
          request.event_id.toString(),
          request.requester_name
        );
        
        blockchainTicketId = mintResult.ticketId;
        transactionHash = mintResult.transactionHash;
        
        console.log('✅ Blockchain ticket minted successfully!', {
          ticketId: blockchainTicketId,
          transactionHash: transactionHash
        });
      } catch (mintError: any) {
        console.error('❌ Blockchain minting failed:', mintError);
        alert('Failed to mint ticket on blockchain: ' + mintError.message);
        setProcessingRequest(null);
        return;
      }

      // Step 2: Store ticket in database
      const { error: ticketInsertError } = await supabase
        .from('tickets')
        .insert({
          ticket_id: parseInt(blockchainTicketId),
          event_id: request.event_id,
          token_id: parseInt(blockchainTicketId),
          owner_address: request.requester_email, // Using email as identifier
          attendee_name: request.requester_name,
          price: 0, // Free ticket from enrollment
          is_used: false,
          transaction_hash: transactionHash,
          created_at: new Date().toISOString()
        });

      if (ticketInsertError) {
        console.error('Error saving ticket to database:', ticketInsertError);
        // Continue anyway since blockchain ticket is minted
      }

      // Step 3: Update request status
      const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({ 
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Step 4: Create ticket email entry for user to see it
      const { error: ticketError } = await supabase
        .from('ticket_emails')
        .insert({
          ticket_id: parseInt(blockchainTicketId),
          event_id: request.event_id,
          recipient_email: request.requester_email,
          ticket_owner: request.requester_email,
          attendee_name: request.requester_name,
          sent_at: new Date().toISOString(),
          transaction_hash: transactionHash,
          qr_data: JSON.stringify({
            eventId: request.event_id,
            ticketId: blockchainTicketId,
            email: request.requester_email,
            transactionHash: transactionHash
          })
        });

      if (ticketError) {
        console.error('Error creating ticket email:', ticketError);
      }

      alert(`✅ Enrollment approved! Blockchain ticket minted successfully.\n\nTicket ID: ${blockchainTicketId}\nTransaction: ${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}\n\nTicket sent to ${request.requester_email}`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: EnrollmentRequest) => {
    setProcessingRequest(request.id);
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      alert(`Enrollment request from ${request.requester_name} has been rejected.`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(4)} ETH`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'minted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'verified': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'used': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className={`text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2`}>
              <Sparkles className="h-8 w-8 text-indigo-600" />
              Analytics Dashboard
            </h1>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Real-time insights into your event verification system
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setDarkMode(!darkMode)} 
              variant="outline"
              className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
            >
              {darkMode ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark Mode
                </>
              )}
            </Button>
            <Button onClick={fetchDashboardData} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
              <Activity className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-600' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats?.total_events || 0}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                <ArrowUpRight className="h-3 w-3" />
                <span>Active events running</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-purple-600' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats?.total_tickets || 0}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <CheckCircle2 className="h-3 w-3" />
                <span>{stats?.verified_tickets || 0} verified</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-green-600' : 'bg-white border-slate-200 hover:border-green-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(stats?.total_revenue || 0)}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                <TrendingUp className="h-3 w-3" />
                <span>From ticket sales</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-600' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats?.total_users || 0}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <Award className="h-3 w-3" />
                <span>{stats?.new_users_week || 0} new this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-4">
          <TabsList className={`grid w-full grid-cols-4 lg:w-[600px] ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {enrollmentRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="ml-2 bg-red-500">{enrollmentRequests.filter(r => r.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Event Performance
                </CardTitle>
                <CardDescription className={darkMode ? 'text-slate-400' : ''}>
                  Overview of your recent events and their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {events.length === 0 ? (
                      <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No events found. Create your first event to get started!</p>
                      </div>
                    ) : (
                      events.map((event) => (
                        <Card key={event.event_id} className={`border transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:border-indigo-600' : 'hover:border-indigo-300'}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : ''}`}>{event.event_name}</h3>
                                <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(event.event_date)}
                                  </span>
                                  {event.location && (
                                    <span>• {event.location}</span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0">
                                {formatCurrency(event.revenue)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{event.tickets_sold}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Sold</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{event.tickets_verified}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Verified</div>
                              </div>
                              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{event.tickets_used}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Used</div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Capacity</span>
                                <span className="font-semibold">{event.capacity_percentage}%</span>
                              </div>
                              <Progress value={parseFloat(event.capacity_percentage)} className="h-2" />
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">
                                Organizer: {formatAddress(event.organizer_address)}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  // Fetch detailed attendee information for this event
                                  const { data: tickets } = await supabase
                                    .from('tickets')
                                    .select('*, events!inner(*)')
                                    .eq('event_id', event.event_id);

                                  const attendees = tickets?.map(t => ({
                                    wallet: t.attendee_wallet || t.owner_address,
                                    name: t.attendee_name || 'Anonymous',
                                    timestamp: t.created_at
                                  })) || [];

                                  setSelectedEvent({
                                    event_id: event.event_id,
                                    event_name: event.event_name,
                                    date: event.event_date,
                                    events_created: 0,
                                    tickets_sold: event.tickets_sold,
                                    revenue: event.revenue,
                                    max_capacity: event.max_capacity || 100,
                                    attendees
                                  });
                                  setShowEventDetails(true);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrollment Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                  <UserPlus className="h-5 w-5 text-indigo-600" />
                  Enrollment Requests
                </CardTitle>
                <CardDescription className={darkMode ? 'text-slate-400' : ''}>
                  Review and approve user enrollment requests for your events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {enrollmentRequests.length === 0 ? (
                      <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No enrollment requests yet</p>
                      </div>
                    ) : (
                      enrollmentRequests.map((request) => (
                        <Card key={request.id} className={`border transition-all ${
                          darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                        } ${request.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : ''}`}>
                                    {request.requester_name}
                                  </h3>
                                  <Badge 
                                    variant={request.status === 'pending' ? 'default' : 'secondary'}
                                    className={
                                      request.status === 'approved' 
                                        ? 'bg-green-600 text-white' 
                                        : request.status === 'rejected'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-yellow-600 text-white'
                                    }
                                  >
                                    {request.status}
                                  </Badge>
                                </div>
                                <div className={`space-y-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{request.requester_email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">{request.event_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>Requested: {formatDate(request.requested_at)}</span>
                                  </div>
                                  {request.responded_at && (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span>Responded: {formatDate(request.responded_at)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {request.status === 'pending' && (
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveRequest(request)}
                                    disabled={processingRequest === request.id}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {processingRequest === request.id ? (
                                      'Processing...'
                                    ) : (
                                      <>
                                        <Check className="h-4 w-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectRequest(request)}
                                    disabled={processingRequest === request.id}
                                    className={`${darkMode ? 'border-red-700 text-red-400 hover:bg-red-950' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Recent Transactions
                </CardTitle>
                <CardDescription className={darkMode ? 'text-slate-400' : ''}>
                  Real-time view of all ticket-related activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions yet. Transactions will appear here once tickets are minted.</p>
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                            darkMode ? 'border-slate-700 hover:bg-slate-800' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2 rounded-full ${
                              tx.action === 'minted' ? 'bg-blue-500/10' :
                              tx.action === 'verified' ? 'bg-green-500/10' :
                              'bg-purple-500/10'
                            }`}>
                              {tx.action === 'minted' && <Ticket className="h-4 w-4 text-blue-500" />}
                              {tx.action === 'verified' && <Shield className="h-4 w-4 text-green-500" />}
                              {tx.action === 'used' && <CheckCircle2 className="h-4 w-4 text-purple-500" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>{tx.event_name || 'Ticket'}</span>
                                <Badge variant="outline" className={getActionColor(tx.action)}>
                                  {tx.action}
                                </Badge>
                              </div>
                              <div className={`flex items-center gap-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {formatAddress(tx.owner_address)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(tx.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {tx.price && (
                              <div className="font-semibold text-green-600">
                                {formatCurrency(tx.price)}
                              </div>
                            )}
                            {tx.transaction_hash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${tx.transaction_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                              >
                                View on Explorer
                                <ArrowUpRight className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription className={darkMode ? 'text-slate-400' : ''}>30-day performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performance.slice(0, 7).map((perf, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                            {new Date(perf.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>{perf.tickets_sold} tickets</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(perf.tickets_sold / Math.max(...performance.map(p => p.tickets_sold), 1)) * 100} 
                            className="h-2"
                          />
                          <span className="text-xs text-green-600 font-semibold min-w-[80px] text-right">
                            {formatCurrency(perf.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                    <Shield className="h-5 w-5 text-indigo-600" />
                    Verification Status
                  </CardTitle>
                  <CardDescription className={darkMode ? 'text-slate-400' : ''}>Ticket verification overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : ''}`}>Verified Tickets</span>
                        <span className="text-2xl font-bold text-green-600">
                          {stats ? Math.round((stats.verified_tickets / (stats.total_tickets || 1)) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stats ? (stats.verified_tickets / (stats.total_tickets || 1)) * 100 : 0} 
                        className="h-3"
                      />
                      <div className={`flex items-center justify-between mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>{stats?.verified_tickets || 0} verified</span>
                        <span>{stats?.total_tickets || 0} total</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : ''}`}>Used Tickets</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {stats ? Math.round((stats.used_tickets / (stats.total_tickets || 1)) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stats ? (stats.used_tickets / (stats.total_tickets || 1)) * 100 : 0} 
                        className="h-3"
                      />
                      <div className={`flex items-center justify-between mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>{stats?.used_tickets || 0} used</span>
                        <span>{stats?.total_tickets || 0} total</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-green-950/30' : 'bg-green-50'}`}>
                        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-600">{stats?.verified_tickets || 0}</div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Verified</div>
                      </div>
                      <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                        <XCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-600">
                          {(stats?.total_tickets || 0) - (stats?.verified_tickets || 0)}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Pending</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className={`border-indigo-200 bg-gradient-to-r ${darkMode ? 'border-indigo-800 from-indigo-950/30 to-purple-950/30' : 'from-indigo-50 to-purple-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500 rounded-full">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className={`font-semibold ${darkMode ? 'text-white' : ''}`}>Real-time Updates Active</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Dashboard automatically updates when new events occur
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className={`max-w-3xl max-h-[80vh] overflow-y-auto ${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <Calendar className="h-5 w-5 text-indigo-600" />
              {selectedEvent?.event_name || 'Event Details'}
            </DialogTitle>
            <DialogDescription className={darkMode ? 'text-slate-400' : ''}>
              Detailed attendee information for this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6">
              {/* Event Summary */}
              <div className={`grid grid-cols-3 gap-4 p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{selectedEvent.tickets_sold}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Attendees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((selectedEvent.tickets_sold / selectedEvent.max_capacity) * 100)}%
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Capacity Filled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(selectedEvent.revenue)}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Revenue</div>
                </div>
              </div>

              {/* Attendees List */}
              <div>
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                  <Users className="h-4 w-4" />
                  Attendees ({selectedEvent.attendees?.length || 0})
                </h4>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {selectedEvent.attendees && selectedEvent.attendees.length > 0 ? (
                      selectedEvent.attendees.map((attendee, index) => (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                            darkMode 
                              ? 'bg-slate-900/50 border-slate-700 hover:border-indigo-600' 
                              : 'bg-white border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-indigo-900' : 'bg-indigo-100'
                            }`}>
                              <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <div className={`font-semibold ${darkMode ? 'text-white' : ''}`}>
                                {attendee.name}
                              </div>
                              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {formatAddress(attendee.wallet)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              Enrolled
                            </div>
                            <div className={`text-sm font-medium ${darkMode ? 'text-white' : ''}`}>
                              {formatDate(attendee.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attendees yet for this event</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
