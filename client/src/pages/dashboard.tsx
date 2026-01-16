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
  Sun
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EventAnalytics, TicketTransaction } from '@/lib/supabase';

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
  date: string;
  events_created: number;
  tickets_sold: number;
  revenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventAnalytics[]>([]);
  const [transactions, setTransactions] = useState<TicketTransaction[]>([]);
  const [performance, setPerformance] = useState<EventPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time subscriptions
    const eventsSubscription = supabase
      .channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_dashboard_stats');

      if (statsError) throw statsError;
      setStats(statsData?.[0] || null);

      // Fetch event analytics
      const { data: eventsData, error: eventsError } = await supabase
        .from('v_event_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('v_recent_transactions')
        .select('*')
        .limit(20);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Fetch performance data
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('get_event_performance', { days_back: 30 });

      if (performanceError) throw performanceError;
      setPerformance(performanceData || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
          <TabsList className={`grid w-full grid-cols-3 lg:w-[400px] ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Event Performance
                </CardTitle>
                <CardDescription>
                  Overview of your recent events and their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {events.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No events found. Create your first event to get started!</p>
                      </div>
                    ) : (
                      events.map((event) => (
                        <Card key={event.event_id} className="border hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-1">{event.event_name}</h3>
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
                              <Button variant="outline" size="sm">
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

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Real-time view of all ticket-related activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions yet. Transactions will appear here once tickets are minted.</p>
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
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
                                <span className="font-semibold">{tx.event_name}</span>
                                <Badge variant="outline" className={getActionColor(tx.action)}>
                                  {tx.action}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>30-day performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performance.slice(0, 7).map((perf, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            {new Date(perf.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="font-semibold">{perf.tickets_sold} tickets</span>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    Verification Status
                  </CardTitle>
                  <CardDescription>Ticket verification overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Verified Tickets</span>
                        <span className="text-2xl font-bold text-green-600">
                          {stats ? Math.round((stats.verified_tickets / (stats.total_tickets || 1)) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stats ? (stats.verified_tickets / (stats.total_tickets || 1)) * 100 : 0} 
                        className="h-3"
                      />
                      <div className="flex items-center justify-between mt-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>{stats?.verified_tickets || 0} verified</span>
                        <span>{stats?.total_tickets || 0} total</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Used Tickets</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {stats ? Math.round((stats.used_tickets / (stats.total_tickets || 1)) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stats ? (stats.used_tickets / (stats.total_tickets || 1)) * 100 : 0} 
                        className="h-3"
                      />
                      <div className="flex items-center justify-between mt-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>{stats?.used_tickets || 0} used</span>
                        <span>{stats?.total_tickets || 0} total</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-600">{stats?.verified_tickets || 0}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Verified</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <XCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-600">
                          {(stats?.total_tickets || 0) - (stats?.verified_tickets || 0)}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Pending</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500 rounded-full">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Real-time Updates Active</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
    </div>
  );
}
