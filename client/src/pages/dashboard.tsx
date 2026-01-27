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
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin
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

  useEffect(() => {
    fetchDashboardData();
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

      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats');
      if (statsError) throw statsError;
      setStats(statsData?.[0] || null);

      const { data: eventsData, error: eventsError } = await supabase
        .from('v_event_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('v_recent_transactions')
        .select('*')
        .limit(20);
      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      const { data: performanceData, error: performanceError } = await supabase.rpc('get_event_performance', { days_back: 30 });
      if (performanceError) throw performanceError;
      setPerformance(performanceData || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `${value.toFixed(4)} ETH`;
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'minted': return 'bg-primary/10 text-primary border-primary/20';
      case 'verified': return 'bg-primary/10 text-primary border-primary/20';
      case 'used': return 'bg-primary/10 text-primary border-primary/20 opacity-70';
      default: return 'bg-muted-foreground/10 text-muted-foreground border-border';
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground font-medium">Analyzing blockchain data...</p>
      </div>
    );
  }

  if (error && !stats) {
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
              Real-time insights into your event verification system
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchDashboardData} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow shadow-primary/20">
              <Activity className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{stats?.total_events || 0}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-green-400">
                <ArrowUpRight className="h-3 w-3" />
                <span>Active events running</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{stats?.total_tickets || 0}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>{stats?.verified_tickets || 0} verified</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{formatCurrency(stats?.total_revenue || 0)}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-green-400">
                <TrendingUp className="h-3 w-3" />
                <span>From ticket sales</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 shadow-glow shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white font-bitcount tracking-normal">{stats?.total_users || 0}</div>
              <div className="flex items-center gap-1 text-[10px] mt-2 font-bold uppercase tracking-wider text-primary">
                <Award className="h-3 w-3" />
                <span>{stats?.new_users_week || 0} new this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-card/50 border border-border p-1 gap-1 w-full lg:w-auto h-auto">
            <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest">Events</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest">Transactions</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 px-8 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            <Card className="bg-card/40 border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Event Performance
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Overview of your recent events and their performance
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
                      events.map((event) => (
                        <Card key={event.event_id} className="bg-background/40 border-border hover:border-primary/50 transition-all group overflow-hidden shadow-glow shadow-primary/5">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">{event.event_name}</h3>
                                <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                  <span className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    {formatDate(event.event_date)}
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
                                {formatCurrency(event.revenue)}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-6">
                              <div className="text-center p-4 bg-primary/5 border border-primary/10 rounded-xl group-hover:bg-primary/10 transition-colors">
                                <div className="text-3xl font-semibold text-primary font-bitcount tracking-normal mb-1">{event.tickets_sold}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sold</div>
                              </div>
                              <div className="text-center p-4 bg-primary/5 border border-primary/10 rounded-xl group-hover:bg-primary/10 transition-colors">
                                <div className="text-3xl font-semibold text-primary font-bitcount tracking-normal mb-1">{event.tickets_verified}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verified</div>
                              </div>
                              <div className="text-center p-4 bg-primary/5 border border-primary/10 rounded-xl group-hover:bg-primary/10 transition-colors">
                                <div className="text-3xl font-semibold text-primary font-bitcount tracking-normal mb-1">{event.tickets_used}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Used</div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                <span>Capacity Utilization</span>
                                <span className="text-primary">{event.capacity_percentage}%</span>
                              </div>
                              <Progress value={parseFloat(event.capacity_percentage)} className="h-1.5 bg-muted border border-border" />
                            </div>

                            <Separator className="my-6 border-border/50" />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                  <Users className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                  Organizer: {formatAddress(event.organizer_address)}
                                </span>
                              </div>
                              <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-widest text-white hover:text-primary hover:bg-primary/10 border border-border">
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                View Analysis
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

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-card/40 border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Transactions
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time view of all ticket-related activities
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                        <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No transactions yet. Transactions will appear here once tickets are minted.</p>
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-5 bg-background/40 border border-border rounded-xl hover:border-primary/50 transition-all hover:bg-card/20 group">
                          <div className="flex items-center gap-5 flex-1">
                            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 group-hover:scale-110 transition-transform shadow-glow shadow-primary/5">
                              {tx.action === 'minted' && <Ticket className="h-5 w-5 text-primary" />}
                              {tx.action === 'verified' && <Shield className="h-5 w-5 text-primary" />}
                              {tx.action === 'used' && <CheckCircle2 className="h-5 w-5 text-primary opacity-70" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-white text-base">{tx.event_name}</span>
                                <Badge variant="outline" className={`${getActionColor(tx.action)} font-bold text-[10px] uppercase tracking-widest`}>
                                  {tx.action}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                <span className="flex items-center gap-2">
                                  <Users className="h-3.5 w-3.5 text-primary" />
                                  {formatAddress(tx.owner_address)}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  {formatDate(tx.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {tx.price && <div className="font-semibold text-primary font-bitcount tracking-normal text-lg">{formatCurrency(tx.price)}</div>}
                            {tx.transaction_hash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${tx.transaction_hash}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1 justify-end mt-2"
                              >
                                View Blockchain <ArrowUpRight className="h-3 w-3" />
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

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card/40 border-border">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">30-day performance overview</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {performance.slice(0, 7).map((perf, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                          <span className="text-muted-foreground">{new Date(perf.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="text-white">{perf.tickets_sold} tickets</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={(perf.tickets_sold / Math.max(...performance.map(p => p.tickets_sold), 1)) * 100} className="h-2 bg-muted flex-1" />
                          <span className="text-xs text-primary font-semibold font-bitcount tracking-normal min-w-[80px] text-right">{formatCurrency(perf.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-border">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-white font-bitcount tracking-normal">
                    <Shield className="h-5 w-5 text-primary" />
                    Verification Status
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Ticket verification overview</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground font-medium">Verified Tickets</span>
                        <span className="text-primary">{stats ? Math.round((stats.verified_tickets / (stats.total_tickets || 1)) * 100) : 0}%</span>
                      </div>
                      <Progress value={stats ? (stats.verified_tickets / (stats.total_tickets || 1)) * 100 : 0} className="h-2.5 bg-muted" />
                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                        <span>{stats?.verified_tickets || 0} verified</span>
                        <span>{stats?.total_tickets || 0} total</span>
                      </div>
                    </div>
                    <Separator className="border-border/50" />
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground font-medium">Used Tickets</span>
                        <span className="text-primary font-bold">{stats ? Math.round((stats.used_tickets / (stats.total_tickets || 1)) * 100) : 0}%</span>
                      </div>
                      <Progress value={stats ? (stats.used_tickets / (stats.total_tickets || 1)) * 100 : 0} className="h-2.5 bg-muted" />
                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                        <span>{stats?.used_tickets || 0} used</span>
                        <span>{stats?.total_tickets || 0} total</span>
                      </div>
                    </div>
                    <Separator className="border-border/50" />
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-5 bg-primary/10 border border-primary/20 rounded-xl shadow-glow shadow-primary/5">
                        <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-primary font-bitcount tracking-normal mb-1">{stats?.verified_tickets || 0}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Certified</div>
                      </div>
                      <div className="text-center p-5 bg-muted/20 border border-border rounded-xl">
                        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <div className="text-3xl font-semibold text-white font-bitcount tracking-normal mb-1">{(stats?.total_tickets || 0) - (stats?.verified_tickets || 0)}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Pending</div>
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
                  <p className="font-bold text-white text-sm uppercase tracking-widest">Real-time Updates Active</p>
                  <p className="text-xs text-muted-foreground font-medium">Dashboard automatically updates via Supabase Webhooks when blockchain events occur</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 px-6 py-1.5 font-bold uppercase tracking-widest text-[10px]">
                <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                Blockchain Live
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
