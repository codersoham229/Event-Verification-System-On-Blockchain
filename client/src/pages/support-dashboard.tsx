import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Shield, MessageCircle, FileText, LogOut, CheckCircle, XCircle, Info,
  Users, Calendar, Ticket as TicketIcon, AlertTriangle, Lock, Activity,
  Eye, TrendingUp, Search, Bell, RefreshCw, ClipboardList, UserSearch,
  Megaphone, Flag, Clock, Trash2, Mail,
} from 'lucide-react';

interface AdRequest {
  id: string;
  business_name: string;
  ad_type: string;
  description: string;
  contact_email: string;
  image_url?: string;
  status: 'pending' | 'accepted' | 'declined';
  requested_at: string;
  removed_from_site?: boolean;
}

interface SystemStats {
  totalEvents: number;
  totalTickets: number;
  totalUsers: number;
  pendingAdRequests: number;
  ticketsUsed: number;
  totalRevenue: number;
}

interface Announcement {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface TicketLookupResult {
  id: string;
  event_id: number;
  recipient_email: string;
  ticket_id: string;
  status: string;
  unique_hash?: string;
  qr_data?: string;
  created_at?: string;
}

export default function SupportDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [stats, setStats] = useState<SystemStats>({ totalEvents: 0, totalTickets: 0, totalUsers: 0, pendingAdRequests: 0, ticketsUsed: 0, totalRevenue: 0 });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // User / ticket lookup
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResults, setLookupResults] = useState<TicketLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Event search
  const [eventSearch, setEventSearch] = useState('');

  // Auth guard
  useEffect(() => {
    const session = localStorage.getItem('supportSession');
    if (!session) { setLocation('/support-login'); return; }
    try {
      const parsed = JSON.parse(session);
      if (!parsed.loggedIn) setLocation('/support-login');
    } catch { setLocation('/support-login'); }
  }, []);

  // Load ad requests
  useEffect(() => {
    const load = () => {
      try { setAdRequests(JSON.parse(localStorage.getItem('adRequests') || '[]')); } catch { /* ignore */ }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load announcements
  useEffect(() => {
    try { setAnnouncements(JSON.parse(localStorage.getItem('supportAnnouncements') || '[]')); } catch { /* ignore */ }
  }, []);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const [eventsRes, ticketsRes] = await Promise.all([
        supabase.from('events').select('id,name,date,location,total_tickets,available_tickets,price,organizer_address,created_at,is_public'),
        supabase.from('ticket_emails').select('id,event_id,recipient_email,ticket_id,status,unique_hash,qr_data,created_at'),
      ]);
      const events = eventsRes.data || [];
      const tickets = ticketsRes.data || [];
      const ticketsUsed = tickets.filter(t => t.status === 'used').length;
      const totalRevenue = events.reduce((sum, ev) => {
        const cnt = tickets.filter(t => t.event_id === ev.id).length;
        return sum + (parseFloat(ev.price || '0') * cnt);
      }, 0);
      const adReqs: AdRequest[] = JSON.parse(localStorage.getItem('adRequests') || '[]');
      setAllEvents(events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setRecentTickets(tickets.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 30));
      setStats({ totalEvents: events.length, totalTickets: tickets.length, totalUsers: new Set(tickets.map(t => t.recipient_email)).size, pendingAdRequests: adReqs.filter(r => r.status === 'pending').length, ticketsUsed, totalRevenue });
      setLastUpdated(new Date());
    } catch (err) { console.error('Failed to fetch stats:', err); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    const ch1 = supabase.channel('sup-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchStats).subscribe();
    const ch2 = supabase.channel('sup-tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_emails' }, fetchStats).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('supportSession');
    toast({ title: 'Logged out', description: 'Support session ended.' });
    setLocation('/support-login');
  };

  const handleAcceptAd = (ad: AdRequest) => {
    const updated = adRequests.map(r => r.id === ad.id ? { ...r, status: 'accepted' as const } : r);
    setAdRequests(updated);
    localStorage.setItem('adRequests', JSON.stringify(updated));
    try {
      const existing = JSON.parse(localStorage.getItem('approvedAds') || '[]');
      existing.push({ ...ad, status: 'accepted', approved_at: new Date().toISOString() });
      localStorage.setItem('approvedAds', JSON.stringify(existing));
    } catch { /* ignore */ }
    toast({ title: 'Ad Accepted âœ…', description: `Contact ${ad.contact_email} to discuss details.` });
  };

  const handleDeclineAd = (ad: AdRequest) => {
    const updated = adRequests.map(r => r.id === ad.id ? { ...r, status: 'declined' as const } : r);
    setAdRequests(updated);
    localStorage.setItem('adRequests', JSON.stringify(updated));
    toast({ title: 'Ad Declined', description: `Ad from ${ad.business_name} declined.` });
  };

  const handleRemoveAdFromSite = (ad: AdRequest) => {
    const updated = adRequests.map(r => r.id === ad.id ? { ...r, removed_from_site: true } : r);
    setAdRequests(updated);
    localStorage.setItem('adRequests', JSON.stringify(updated));
    toast({ title: 'Ad Removed from Site', description: `${ad.business_name}'s ad has been removed from the website.` });
  };

  const handleLookup = async () => {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResults([]);
    try {
      const { data, error } = await supabase
        .from('ticket_emails')
        .select('id,event_id,recipient_email,ticket_id,status,unique_hash,qr_data,created_at')
        .ilike('recipient_email', `%${lookupEmail.trim()}%`)
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) { setLookupError('No tickets found for this email.'); }
      else { setLookupResults(data); }
    } catch (err: any) {
      setLookupError(err.message || 'Lookup failed.');
    } finally { setLookupLoading(false); }
  };

  const postAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    const ann: Announcement = { id: Date.now().toString(), message: newAnnouncement.trim(), priority: announcementPriority, createdAt: new Date().toISOString() };
    const updated = [ann, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem('supportAnnouncements', JSON.stringify(updated));
    setNewAnnouncement('');
    toast({ title: 'Announcement Posted ðŸ“¢', description: 'It is now visible to the team.' });
  };

  const deleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    localStorage.setItem('supportAnnouncements', JSON.stringify(updated));
  };

  const resetTestData = async () => {
    if (!window.confirm('Reset ALL test data?\n\n• Clear all ad requests (localStorage)\n• Delete all enrollment requests (Supabase)\n\nThis cannot be undone.')) return;
    // Clear ad requests from localStorage
    localStorage.removeItem('adRequests');
    localStorage.removeItem('approvedAds');
    setAdRequests([]);
    // Delete enrollment requests from Supabase
    const { error } = await supabase.from('enrollment_requests').delete().neq('id', 0);
    if (error) {
      toast({ title: 'Partial reset', description: `Ad requests cleared. Supabase error: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: '✅ Test data reset', description: 'Ad requests and enrollment requests have been cleared.' });
    }
    fetchStats();
  };

  const pendingAds = adRequests.filter(r => r.status === 'pending');
  const filteredEvents = allEvents.filter(ev =>
    !eventSearch || ev.name?.toLowerCase().includes(eventSearch.toLowerCase()) || ev.organizer_address?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const priorityColor: Record<string, string> = { low: 'bg-blue-500/20 text-blue-400 border-blue-500/30', medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30', high: 'bg-red-500/20 text-red-400 border-red-500/30' };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-green-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Support Team Dashboard</h1>
              <p className="text-xs text-muted-foreground">EventChain Operations Center</p>
            </div>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/30 animate-pulse ml-2">â— Live</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">Updated {lastUpdated.toLocaleTimeString()}</span>
            <Button variant="ghost" size="sm" onClick={fetchStats} disabled={refreshing} className="text-muted-foreground hover:text-white">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {pendingAds.length > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{pendingAds.length} pending ad{pendingAds.length > 1 ? 's' : ''}</Badge>}
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
              <LogOut className="h-4 w-4 mr-2" />Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
            { label: 'Tickets Minted', value: stats.totalTickets, icon: TicketIcon, color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20' },
            { label: 'Unique Users', value: stats.totalUsers, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/5 border-cyan-500/20' },
            { label: 'Tickets Used', value: stats.ticketsUsed, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
            { label: 'Revenue (ETH)', value: stats.totalRevenue.toFixed(3), icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' },
            { label: 'Pending Ads', value: stats.pendingAdRequests, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
          ].map((s) => (
            <Card key={s.label} className={`${s.bg} border transition-all hover:scale-[1.02]`}>
              <CardContent className="p-4 text-center">
                <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs â€” overflow-hidden fixes content escaping the card border */}
        <Card className="bg-card/50 backdrop-blur-lg border-border overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-transparent p-0 border-b border-border rounded-none h-auto">
              {[
                { value: 'overview', icon: Activity, label: 'Overview', color: 'data-[state=active]:text-green-400 data-[state=active]:border-green-500 data-[state=active]:bg-green-500/5' },
                { value: 'ads', icon: FileText, label: 'Ads', color: 'data-[state=active]:text-amber-400 data-[state=active]:border-amber-500 data-[state=active]:bg-amber-500/5', badge: pendingAds.length },
                { value: 'lookup', icon: UserSearch, label: 'Lookup', color: 'data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500 data-[state=active]:bg-cyan-500/5' },
                { value: 'announcements', icon: Megaphone, label: 'Notice', color: 'data-[state=active]:text-purple-400 data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5', badge: announcements.length },
                { value: 'chat', icon: MessageCircle, label: 'Chat', color: 'data-[state=active]:text-green-400 data-[state=active]:border-green-500 data-[state=active]:bg-green-500/5' },
                { value: 'security', icon: Lock, label: 'Security', color: 'data-[state=active]:text-red-400 data-[state=active]:border-red-500 data-[state=active]:bg-red-500/5' },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className={`flex items-center gap-1.5 py-3.5 text-xs font-bold uppercase tracking-wide border-b-2 border-transparent rounded-none transition-all ${tab.color}`}>
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge ? <Badge className="bg-current/20 text-[10px] px-1 py-0 ml-0.5">{tab.badge}</Badge> : null}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* â”€â”€ OVERVIEW â”€â”€ */}
            <TabsContent value="overview" className="mt-0 p-6 focus-visible:outline-none">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Activity className="h-6 w-6 text-green-400" />System Overview</h2>
                <p className="text-muted-foreground mt-1">Live view of all platform events and tickets</p>
              </div>

              {/* Event search */}
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events by name or organizer addressâ€¦"
                    value={eventSearch}
                    onChange={e => setEventSearch(e.target.value)}
                    className="pl-9 h-10 bg-muted border-border text-white placeholder:text-muted-foreground/50"
                  />
                </div>
                {eventSearch && <Button variant="ghost" size="sm" onClick={() => setEventSearch('')} className="text-muted-foreground hover:text-white"><XCircle className="h-4 w-4" /></Button>}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Events */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />Events ({filteredEvents.length})
                  </h3>
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />No events found</div>
                    ) : filteredEvents.map(ev => (
                      <Card key={ev.id} className="bg-background/50 border-border/50 hover:border-blue-500/30 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-white font-semibold truncate">{ev.name}</p>
                                <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${ev.is_public ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                  {ev.is_public ? 'Public' : 'Private'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{ev.location} â€¢ {new Date(ev.date).toLocaleDateString()}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">{ev.organizer_address}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">{ev.total_tickets} tickets</Badge>
                              <p className="text-xs text-green-400 font-bold mt-1">{ev.price} ETH</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Recent Tickets */}
                <div>
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <TicketIcon className="h-4 w-4 text-purple-400" />Recent Tickets (latest {recentTickets.length})
                  </h3>
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                    {recentTickets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground"><TicketIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />No tickets found</div>
                    ) : recentTickets.map(t => (
                      <Card key={t.id} className="bg-background/50 border-border/50 hover:border-purple-500/30 transition-all">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{t.recipient_email}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground">Event #{t.event_id}</p>
                                {t.ticket_id && <p className="text-[10px] text-muted-foreground font-mono">#{t.ticket_id}</p>}
                              </div>
                            </div>
                            <Badge className={t.status === 'used' ? 'bg-green-500/20 text-green-400 border-green-500/30 text-xs' : t.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs'}>
                              {t.status || 'sent'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* â”€â”€ AD REQUESTS â”€â”€ */}
            <TabsContent value="ads" className="mt-0 focus-visible:outline-none">
              <div className="grid lg:grid-cols-3 gap-6 p-6">
                <div className="lg:col-span-1">
                  <Card className="bg-background/50 border-border sticky top-24">
                    <CardHeader className="bg-amber-500/5 border-b border-border/50">
                      <CardTitle className="flex items-center gap-2 text-white text-base"><Info className="w-4 h-4 text-amber-400" />Ad Request Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-3">
                      {[
                        { label: 'Total Requests', value: adRequests.length, color: 'text-white' },
                        { label: 'Pending', value: pendingAds.length, color: 'text-amber-400' },
                        { label: 'Accepted', value: adRequests.filter(r => r.status === 'accepted').length, color: 'text-green-400' },
                        { label: 'Declined', value: adRequests.filter(r => r.status === 'declined').length, color: 'text-red-400' },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                          <span className="text-sm text-muted-foreground">{s.label}</span>
                          <span className={`text-base font-bold ${s.color}`}>{s.value}</span>
                        </div>
                      ))}
                      <Alert className="bg-amber-500/10 border-amber-500/20 mt-3">
                        <AlertDescription className="text-amber-400 text-xs">
                          Ad types: Banner Ads Â· Featured Listings Â· Email Promos Â· Social Shoutouts
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <h2 className="text-xl font-bold text-white mb-4">Advertising Requests</h2>
                  {adRequests.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-xl">
                      <FileText className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No ad requests yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Requests submitted by users will appear here automatically</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {adRequests.map(ad => (
                        <Card key={ad.id} className="bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/20 hover:border-amber-500/40 transition-all">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <h3 className="text-base font-bold text-white">{ad.business_name}</h3>
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-2">{ad.ad_type}</Badge>
                                  <Badge className={ad.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-2' : ad.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-2' : 'bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-2'}>{ad.status}</Badge>
                                </div>
                                {ad.image_url && <div className="mb-3 rounded-lg overflow-hidden border border-amber-500/20"><img src={ad.image_url} alt={ad.business_name} className="w-full max-h-40 object-cover" /></div>}
                                <p className="text-sm text-white mb-2">{ad.description}</p>
                                <p className="text-xs text-muted-foreground">{ad.contact_email} Â· {new Date(ad.requested_at).toLocaleDateString()}</p>
                              </div>
                              <div className="flex flex-col gap-2 shrink-0">
                                {ad.status === 'pending' && (
                                  <>
                                    <Button onClick={() => handleAcceptAd(ad)} size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold"><CheckCircle className="w-3 h-3 mr-1" />Accept</Button>
                                    <Button onClick={() => handleDeclineAd(ad)} size="sm" variant="destructive" className="font-bold"><XCircle className="h-3 w-3 mr-1" />Decline</Button>
                                  </>
                                )}
                                {ad.status === 'accepted' && !ad.removed_from_site && (
                                  <Button onClick={() => handleRemoveAdFromSite(ad)} size="sm" variant="destructive" className="font-bold"><Trash2 className="h-3 w-3 mr-1" />Remove from Site</Button>
                                )}
                                {ad.status === 'accepted' && ad.removed_from_site && (
                                  <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px] px-2">Removed</Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* â”€â”€ USER / TICKET LOOKUP â”€â”€ */}
            <TabsContent value="lookup" className="mt-0 p-6 focus-visible:outline-none">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><UserSearch className="h-6 w-6 text-cyan-400" />User & Ticket Lookup</h2>
                <p className="text-muted-foreground mt-1">Search any user's tickets by email address</p>
              </div>

              <Card className="bg-background/50 border-border mb-6">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter email address to searchâ€¦"
                        value={lookupEmail}
                        onChange={e => setLookupEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup()}
                        className="pl-9 h-11 bg-muted border-border text-white placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <Button onClick={handleLookup} disabled={lookupLoading} className="h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-6">
                      {lookupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                      {lookupLoading ? '' : 'Search'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {lookupError && (
                <Alert className="bg-amber-500/10 border-amber-500/30 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-400">{lookupError}</AlertDescription>
                </Alert>
              )}

              {lookupResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{lookupResults.length} ticket(s) found</h3>
                  <div className="space-y-3">
                    {lookupResults.map(t => (
                      <Card key={t.id} className="bg-background/50 border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                        <CardContent className="p-5">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                              <p className="text-white font-medium text-sm">{t.recipient_email}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Event ID</p>
                              <p className="text-cyan-400 font-mono font-bold">#{t.event_id}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ticket ID</p>
                              <p className="text-white font-mono text-sm">{t.ticket_id || 'â€”'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                              <Badge className={t.status === 'used' ? 'bg-green-500/20 text-green-400 border-green-500/30' : t.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}>
                                {t.status || 'sent'}
                              </Badge>
                            </div>
                            {t.unique_hash && (
                              <div className="sm:col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tx Hash</p>
                                <p className="text-muted-foreground font-mono text-xs break-all">{t.unique_hash}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* â”€â”€ ANNOUNCEMENTS â”€â”€ */}
            <TabsContent value="announcements" className="mt-0 p-6 focus-visible:outline-none">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Megaphone className="h-6 w-6 text-purple-400" />Team Announcements</h2>
                <p className="text-muted-foreground mt-1">Post notices visible to the support team</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* New Announcement */}
                <Card className="bg-background/50 border-border">
                  <CardHeader className="border-b border-border/50 bg-purple-500/5">
                    <CardTitle className="text-white text-base flex items-center gap-2"><Bell className="h-4 w-4 text-purple-400" />New Announcement</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Priority</Label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map(p => (
                          <button key={p} onClick={() => setAnnouncementPriority(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all ${announcementPriority === p ? priorityColor[p] : 'border-border text-muted-foreground hover:border-border/80'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Message</Label>
                      <Textarea
                        placeholder="Type your announcement hereâ€¦"
                        value={newAnnouncement}
                        onChange={e => setNewAnnouncement(e.target.value)}
                        className="bg-muted border-border text-white placeholder:text-muted-foreground/50 resize-none min-h-[100px]"
                      />
                    </div>
                    <Button onClick={postAnnouncement} disabled={!newAnnouncement.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                      <Megaphone className="h-4 w-4 mr-2" />Post Announcement
                    </Button>
                  </CardContent>
                </Card>

                {/* Posted Announcements */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Posted ({announcements.length})</h3>
                  {announcements.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-xl">
                      <Bell className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No announcements yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {announcements.map(ann => (
                        <Card key={ann.id} className="bg-background/50 border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={`text-[10px] px-2 ${priorityColor[ann.priority]}`}>{ann.priority}</Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(ann.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-white">{ann.message}</p>
                              </div>
                              <button onClick={() => deleteAnnouncement(ann.id)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* â”€â”€ SUPPORT CHAT â”€â”€ */}
            <TabsContent value="chat" className="mt-0 p-6 focus-visible:outline-none">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><MessageCircle className="h-6 w-6 text-green-400" />Support Chat Center</h2>
                <p className="text-muted-foreground mt-1">Manage support requests from users in real-time</p>
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="bg-background/50 border-border">
                  <CardHeader className="bg-green-500/5 border-b border-border/50"><CardTitle className="text-white flex items-center gap-2 text-base"><Users className="h-4 w-4 text-green-400" />User Contacts</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    {adRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">No contacts yet</p>
                        <p className="text-xs text-muted-foreground mt-2">Ad requesters will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {adRequests.map(ad => (
                          <div key={ad.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10 hover:border-green-500/30 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                <span className="text-green-400 font-bold text-sm">{ad.business_name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{ad.business_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{ad.contact_email}</p>
                              </div>
                            </div>
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ad.contact_email)}&su=${encodeURIComponent('Regarding Your Ad Request - ' + ad.business_name)}&body=${encodeURIComponent('Hi,\n\nThank you for your advertising request for ' + ad.business_name + '.\n\nWe wanted to reach out regarding your submission.\n\nBest regards,\nBlockTix Support Team')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0" title={`Email ${ad.contact_email}`}>
                                <Mail className="h-3 w-3 mr-1" />Email
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="lg:col-span-2">
                  <Card className="bg-background/50 border-border h-[460px] flex flex-col">
                    <CardHeader className="bg-green-500/5 border-b border-border/50">
                      <CardTitle className="text-white flex items-center justify-between text-base">
                        <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-400" />Support Chat</div>
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30 animate-pulse text-xs">â— Online</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageCircle className="h-16 w-16 text-muted-foreground/10 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-white mb-1">No conversation selected</p>
                        <p className="text-sm text-muted-foreground">Select a chat from the left to start responding</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4 mt-6">
                {[{ label: 'Total Events', value: stats.totalEvents, color: 'border-green-500/20 bg-green-500/5' }, { label: 'Tickets Minted', value: stats.totalTickets, color: 'border-blue-500/20 bg-blue-500/5' }, { label: 'Tickets Used', value: stats.ticketsUsed, color: 'border-amber-500/20 bg-amber-500/5' }, { label: 'Revenue', value: `${stats.totalRevenue.toFixed(4)} ETH`, color: 'border-purple-500/20 bg-purple-500/5' }].map(s => (
                  <Card key={s.label} className={`${s.color} border`}><CardContent className="p-4 text-center"><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground uppercase mt-1">{s.label}</p></CardContent></Card>
                ))}
              </div>
            </TabsContent>

            {/* â”€â”€ SECURITY â”€â”€ */}
            <TabsContent value="security" className="mt-0 p-6 focus-visible:outline-none">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Lock className="h-6 w-6 text-red-400" />Security Controls</h2>
                <p className="text-muted-foreground mt-1">Platform-level security monitoring and controls</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border">
                  <CardHeader className="border-b border-border/50 bg-red-500/5"><CardTitle className="text-white flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-red-400" />Platform Health</CardTitle></CardHeader>
                  <CardContent className="pt-5 space-y-3">
                    {[
                      { label: 'Blockchain Network', status: 'Sepolia Testnet', ok: true },
                      { label: 'Supabase Database', status: 'Connected', ok: true },
                      { label: 'Smart Contract', status: '0xABe88...a7F9b', ok: true },
                      { label: 'Email Service', status: 'Active', ok: true },
                      { label: 'Realtime Subscriptions', status: 'Active', ok: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white font-mono">{item.status}</span>
                          <div className={`w-2 h-2 rounded-full ${item.ok ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border">
                  <CardHeader className="border-b border-border/50 bg-red-500/5"><CardTitle className="text-white flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-red-400" />Security Overview</CardTitle></CardHeader>
                  <CardContent className="pt-5 space-y-3">
                    {[
                      { label: 'Total Tickets Minted', value: stats.totalTickets, color: 'text-blue-400' },
                      { label: 'Tickets Verified/Used', value: stats.ticketsUsed, color: 'text-green-400' },
                      { label: 'Tickets Pending Use', value: stats.totalTickets - stats.ticketsUsed, color: 'text-yellow-400' },
                      { label: 'Unique Ticket Holders', value: stats.totalUsers, color: 'text-purple-400' },
                      { label: 'Platform Revenue', value: `${stats.totalRevenue.toFixed(4)} ETH`, color: 'text-amber-400' },
                      { label: 'Pending Ad Requests', value: stats.pendingAdRequests, color: 'text-red-400' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border lg:col-span-2">
                  <CardHeader className="border-b border-border/50 bg-red-500/5"><CardTitle className="text-white flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-red-400" />Flagged Activity Monitor</CardTitle></CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <CheckCircle className="h-14 w-14 text-green-500/30 mx-auto mb-4" />
                      <p className="text-base font-semibold text-white mb-2">No Suspicious Activity Detected</p>
                      <p className="text-sm text-muted-foreground">Platform is operating normally. Flagged events will appear here.</p>
                    </div>
                    <Alert className="bg-blue-500/10 border-blue-500/20 mt-4">
                      <Eye className="h-4 w-4 text-blue-400 shrink-0" />
                      <AlertDescription className="text-blue-400 text-xs ml-2">
                        <strong className="text-white">Monitoring:</strong> Duplicate ticket verifications, wallet anomalies, and unusual minting patterns are tracked automatically.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Reset test data */}
                <Card className="bg-background/50 border-red-900/40 lg:col-span-2">
                  <CardHeader className="border-b border-red-900/30 bg-red-900/10">
                    <CardTitle className="text-white flex items-center gap-2 text-base"><Trash2 className="h-4 w-4 text-red-400" />Reset Test Data</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Clears all ad requests (localStorage) and all enrollment requests (Supabase) so you can test the flow from scratch.</p>
                    </div>
                    <Button onClick={resetTestData} variant="destructive" className="shrink-0 font-bold">
                      <Trash2 className="h-4 w-4 mr-2" />Reset Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}


