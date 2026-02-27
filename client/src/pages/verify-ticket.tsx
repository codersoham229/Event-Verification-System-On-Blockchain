import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  Ticket as TicketIcon,
  Shield,
  Clock,
  ExternalLink,
  Fingerprint,
  Blocks,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { contractService } from '@/lib/contract';
import { supabase } from '@/lib/supabase';

// CSS keyframe animations injected inline
const animationStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ringPulse {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
    70% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }
  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
  .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
  .animate-slideInLeft { animation: slideInLeft 0.6s ease-out forwards; }
  .animate-slideInRight { animation: slideInRight 0.6s ease-out forwards; }
  .animate-ringPulse { animation: ringPulse 2s infinite; }
  .animate-floatSlow { animation: floatSlow 6s ease-in-out infinite; }
  .bg-gradient-animate {
    background-size: 200% 200%;
    animation: gradient 4s ease infinite;
  }
  .shimmer-text {
    background: linear-gradient(90deg, #10b981, #a78bfa, #10b981);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 3s linear infinite;
  }
`;

export default function VerifyTicket() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [verifyStep, setVerifyStep] = useState<'connecting' | 'reading' | 'verifying' | 'done'>('connecting');
  const [ticketData, setTicketData] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eid = params.get('eventId');
    const tid = params.get('ticketId');

    if (eid && tid) {
      setEventId(eid);
      setTicketId(tid);
      // Load preview data from Supabase
      loadPreviewData(eid, tid);
    } else {
      setError('Invalid QR code — missing event or ticket information');
      setShowPreview(false);
      setShowResult(true);
    }
  }, []);

  const loadPreviewData = async (eid: string, tid: string) => {
    try {
      // Fetch event and ticket details from Supabase for preview
      const { data: eventRecord } = await supabase
        .from('events')
        .select('*')
        .eq('id', eid)
        .single();

      const { data: ticketRecord } = await supabase
        .from('ticket_emails')
        .select('*')
        .eq('event_id', eid)
        .eq('ticket_id', tid)
        .single();

      if (eventRecord) {
        setPreviewData({
          event: eventRecord,
          ticket: ticketRecord
        });
      }
    } catch (err) {
      console.warn('Could not load preview data:', err);
    }
  };

  const handleVerifyClick = () => {
    if (eventId && ticketId) {
      setShowPreview(false);
      runVerification(eventId, ticketId);
    }
  };

  const runVerification = async (eventId: string, ticketId: string) => {
    try {
      setLoading(true);

      // Step 1 — Connecting to blockchain
      setVerifyStep('connecting');
      await delay(800);

      // Step 2 — Reading smart contract
      setVerifyStep('reading');
      await delay(600);

      // Step 3 — Verifying ticket
      setVerifyStep('verifying');
      const verification = await contractService.verifyTicket(eventId, ticketId);
      setTicketData(verification);

      // Get event details from blockchain too
      try {
        const event = await contractService.getEvent(eventId);
        setEventData(event);
      } catch (evtErr) {
        console.warn('Could not load event details from blockchain:', evtErr);
      }

      // Resolve the actual email from Supabase using ticketId (email is NOT on blockchain)
      try {
        const { data: ticketRecord } = await supabase
          .from('ticket_emails')
          .select('recipient_email')
          .eq('ticket_id', ticketId)
          .single();
        if (ticketRecord?.recipient_email) {
          setRecipientEmail(ticketRecord.recipient_email);
        }
      } catch (dbErr) {
        console.warn('Could not resolve email from database:', dbErr);
      }

      setVerifyStep('done');
      await delay(300);

      setLoading(false);
      // Stagger the result reveal
      setTimeout(() => setShowResult(true), 100);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify ticket on blockchain');
      setLoading(false);
      setTimeout(() => setShowResult(true), 100);
    }
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // --- Preview state - show event details before verification ---
  if (showPreview && previewData) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated background orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -top-60 -left-60 animate-floatSlow" />
            <div className="absolute w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px] bottom-[-200px] right-[-150px] animate-floatSlow" style={{ animationDelay: '3s' }} />
          </div>

          <div className="relative z-10 w-full max-w-2xl">
            {/* Logo */}
            <div className="text-center mb-8 animate-fadeInUp">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30">
                  <TicketIcon className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Block<span className="text-emerald-400">Tix</span> Event Ticket
              </h1>
              <p className="text-slate-400 text-sm">Blockchain-Verified Event Entry</p>
            </div>

            {/* Event Details Card */}
            <div className="animate-scaleIn mb-6" style={{ animationDelay: '0.2s' }}>
              <Card className="bg-slate-900/60 border-emerald-500/30 backdrop-blur-xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-purple-500 to-blue-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-white">
                    {previewData.event.name}
                  </CardTitle>
                  <p className="text-slate-400 text-sm mt-2">
                    {previewData.event.description || 'Join us for this exciting event!'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pb-6">
                  {/* Event Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <Calendar className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Date</p>
                      </div>
                      <p className="text-white font-semibold text-lg">
                        {new Date(previewData.event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Time</p>
                      </div>
                      <p className="text-white font-semibold text-lg">
                        {new Date(previewData.event.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>

                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 sm:col-span-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Location</p>
                      </div>
                      <p className="text-white font-semibold text-lg">
                        {previewData.event.location || 'Venue TBA'}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Info */}
                  {previewData.ticket && (
                    <div className="border-t border-slate-700/50 pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Event ID</p>
                          <p className="text-emerald-400 font-mono text-sm font-semibold">#{eventId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Ticket ID</p>
                          <p className="text-purple-400 font-mono text-sm font-semibold">{ticketId}</p>
                        </div>
                      </div>
                      {previewData.ticket.recipient_email && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Issued To</p>
                          <p className="text-white font-medium text-sm">{previewData.ticket.recipient_email}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verification Notice */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-emerald-400 font-semibold text-sm mb-1">Blockchain Verification Required</p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          Click the button below to verify this ticket's authenticity on the Ethereum blockchain. This ensures the ticket is legitimate and has not been forged.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerifyClick}
                    className="w-full bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-700 hover:to-purple-700 text-white py-6 text-lg font-bold shadow-xl shadow-emerald-500/20"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Verify Ticket on Blockchain
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => setLocation('/')}
                      className="text-slate-400 hover:text-white"
                    >
                      Back to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- Loading state with step progress ---
  if (loading) {
    const steps = [
      { key: 'connecting', label: 'Connecting to Sepolia Network', icon: Blocks },
      { key: 'reading', label: 'Reading Smart Contract', icon: Fingerprint },
      { key: 'verifying', label: 'Verifying NFT Ticket', icon: Shield },
      { key: 'done', label: 'Complete', icon: CheckCircle }
    ];
    const currentIdx = steps.findIndex(s => s.key === verifyStep);

    return (
      <>
        <style>{animationStyles}</style>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated background orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -top-60 -left-60 animate-floatSlow" />
            <div className="absolute w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px] bottom-[-200px] right-[-150px] animate-floatSlow" style={{ animationDelay: '3s' }} />
          </div>

          <div className="relative z-10 w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-10 animate-fadeInUp">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30">
                  <Shield className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">BlockTix Verification</h1>
              <p className="text-slate-400 text-sm">Verifying on Ethereum Sepolia Blockchain</p>
            </div>

            {/* Step indicator */}
            <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === currentIdx;
                const isDone = idx < currentIdx;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500
                      ${isActive ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10' :
                        isDone ? 'bg-slate-800/30 border-emerald-500/20' :
                        'bg-slate-900/30 border-slate-700/30 opacity-40'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500
                      ${isActive ? 'bg-emerald-500/20 animate-ringPulse' :
                        isDone ? 'bg-emerald-500/20' : 'bg-slate-700/30'}`}>
                      {isDone ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : isActive ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent" />
                      ) : (
                        <Icon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isActive ? 'text-emerald-300' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <div className="mt-2 h-1 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full"
                            style={{ width: '60%', animation: 'shimmer 1.5s ease-in-out infinite', backgroundSize: '200% auto' }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- Result state ---
  return (
    <>
      <style>{animationStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] -top-72 -left-72 animate-floatSlow" />
          <div className="absolute w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px] -bottom-60 -right-60 animate-floatSlow" style={{ animationDelay: '3s' }} />
          <div className="absolute w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>

        <div className="max-w-lg mx-auto relative z-10 py-6 sm:py-10">
          {/* Logo header */}
          <div className={`text-center mb-8 ${showResult ? 'animate-fadeInUp' : 'opacity-0'}`}>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
              Block<span className="text-emerald-400">Tix</span>
            </h1>
            <p className="text-slate-400 text-sm">Blockchain Ticket Verification</p>
          </div>

          {/* Error state */}
          {error ? (
            <div className={`${showResult ? 'animate-scaleIn' : 'opacity-0'}`}>
              <Card className="bg-slate-900/60 border-red-500/40 backdrop-blur-xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-500" />
                <CardContent className="pt-8 pb-8">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full mb-5 border-2 border-red-500/30">
                      <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Verification Failed</h2>
                    <p className="text-red-400/90 mb-2 text-sm leading-relaxed max-w-sm mx-auto">{error}</p>
                    <div className="mt-6 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        Could not verify this ticket on the Ethereum blockchain
                      </p>
                    </div>
                    <Button
                      onClick={() => setLocation('/')}
                      className="mt-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8"
                    >
                      Go to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : ticketData?.valid ? (
            <div className="space-y-5">

              {/* SUCCESS — Main verification card */}
              <div className={`${showResult ? 'animate-scaleIn' : 'opacity-0'}`}>
                <Card className="bg-gradient-to-br from-emerald-950/60 to-green-950/40 border-emerald-500/40 backdrop-blur-xl overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-gradient-animate" />
                  <CardContent className="pt-8 pb-6">
                    <div className="text-center">
                      {/* Animated checkmark ring */}
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-5 animate-ringPulse"
                        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }}>
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400/50 flex items-center justify-center">
                          <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Ticket Verified</h2>
                      <p className="shimmer-text text-lg font-semibold">Authenticated on Ethereum Blockchain</p>

                      {ticketData.isUsed && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/15 rounded-lg border border-yellow-500/40">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-300 font-medium text-sm">Ticket Already Used</span>
                        </div>
                      )}

                      {!ticketData.isUsed && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300 font-medium text-sm">Valid & Ready for Entry</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Event Details */}
              {eventData && (
                <div className={`${showResult ? 'animate-slideInLeft' : 'opacity-0'}`} style={{ animationDelay: '0.15s' }}>
                  <Card className="bg-slate-900/50 border-purple-500/25 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-700/50">
                      <CardTitle className="flex items-center gap-2 text-white text-base">
                        <TicketIcon className="w-5 h-5 text-purple-400" />
                        Event Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                          <TicketIcon className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Event Name</p>
                          <p className="text-white font-semibold text-lg leading-tight">{eventData.name}</p>
                        </div>
                      </div>

                      {eventData.description && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                            <MapPin className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Description</p>
                            <p className="text-slate-300 text-sm">{eventData.description}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-3 bg-slate-800/30 p-3 rounded-lg">
                          <Calendar className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Date</p>
                            <p className="text-white text-sm font-medium">
                              {new Date(eventData.date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-slate-800/30 p-3 rounded-lg">
                          <Clock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Time</p>
                            <p className="text-white text-sm font-medium">
                              {new Date(eventData.date).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/30 p-3 rounded-lg">
                        <TicketIcon className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Ticket Price</p>
                          <p className="text-white font-semibold">{eventData.ticketPrice} ETH</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Attendee Info */}
              <div className={`${showResult ? 'animate-slideInRight' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
                <Card className="bg-slate-900/50 border-emerald-500/20 backdrop-blur-xl overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-700/50">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <User className="w-5 h-5 text-emerald-400" />
                      Attendee Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {recipientEmail && (
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">Attendee Email</p>
                        <p className="text-white font-semibold text-lg">{recipientEmail}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">On-Chain Identity Hash</p>
                      <p className="text-purple-400 font-mono text-[11px] break-all bg-purple-500/5 p-2.5 rounded-lg border border-purple-500/20">
                        {ticketData.attendeeName}
                      </p>
                      <p className="text-slate-600 text-[10px] mt-1">🔒 Only a privacy hash is stored on the blockchain — not the actual email</p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">Wallet Address (NFT Owner)</p>
                      <p className="text-emerald-400 font-mono text-xs break-all bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/20">
                        {ticketData.owner}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">Ticket Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${ticketData.isUsed ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-emerald-400 shadow-lg shadow-emerald-400/50'}`} />
                        <p className={`font-semibold text-sm ${ticketData.isUsed ? 'text-yellow-400' : 'text-emerald-400'}`}>
                          {ticketData.isUsed ? 'Already Used' : 'Valid & Unused'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Blockchain Proof */}
              <div className={`${showResult ? 'animate-fadeInUp' : 'opacity-0'}`} style={{ animationDelay: '0.45s' }}>
                <Card className="bg-gradient-to-br from-purple-950/40 to-blue-950/30 border-purple-500/25 backdrop-blur-xl overflow-hidden">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-purple-500/15 rounded-xl border border-purple-500/30 shrink-0 mt-0.5">
                        <Shield className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold mb-1">Verified on Ethereum Blockchain</p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          This ticket is an NFT minted on the Sepolia testnet smart contract.
                          Its authenticity is cryptographically guaranteed by the Ethereum blockchain — it cannot be forged or duplicated.
                        </p>
                        <a
                          href={`https://sepolia.etherscan.io/address/${contractService.getContractAddress()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                        >
                          View Smart Contract on Etherscan
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action */}
              <div className={`text-center pt-2 ${showResult ? 'animate-fadeInUp' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
                <Button
                  onClick={() => setLocation('/')}
                  className="bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-700 hover:to-purple-700 text-white px-10 py-6 text-base font-semibold shadow-xl shadow-emerald-500/10"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          ) : (
            /* INVALID ticket */
            <div className={`${showResult ? 'animate-scaleIn' : 'opacity-0'}`}>
              <Card className="bg-slate-900/60 border-red-500/40 backdrop-blur-xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-red-700" />
                <CardContent className="pt-8 pb-8">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full mb-5 border-2 border-red-500/30">
                      <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Invalid Ticket</h2>
                    <p className="text-red-400/90 mb-2 text-sm max-w-sm mx-auto">
                      This ticket NFT could not be found or verified on the Ethereum blockchain.
                    </p>
                    <div className="mt-5 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-red-400" />
                        The NFT does not exist on the smart contract
                      </p>
                    </div>
                    <Button
                      onClick={() => setLocation('/')}
                      className="mt-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8"
                    >
                      Go to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
