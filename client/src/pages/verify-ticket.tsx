import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, XCircle, Calendar, MapPin, User, Ticket as TicketIcon, Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { contractService } from '@/lib/contract';

export default function VerifyTicket() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    const ticketId = params.get('ticketId');

    if (eventId && ticketId) {
      verifyTicket(eventId, ticketId);
    } else {
      setError('Invalid QR code - missing event or ticket information');
      setLoading(false);
    }
  }, []);

  const verifyTicket = async (eventId: string, ticketId: string) => {
    try {
      setLoading(true);
      
      // Verify the ticket
      const verification = await contractService.verifyTicket(eventId, ticketId);
      setTicketData(verification);

      // Get event details
      const event = await contractService.getEvent(eventId);
      setEventData(event);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify ticket');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-white text-xl">Verifying ticket on blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent mb-2">
            BlockTix Verification
          </h1>
          <p className="text-slate-400">Blockchain-Powered Event Ticketing</p>
        </div>

        {error ? (
          <Card className="bg-slate-800/50 border-red-500/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
                <p className="text-red-400 mb-6">{error}</p>
                <Button 
                  onClick={() => setLocation('/')}
                  className="bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : ticketData?.valid ? (
          <div className="space-y-6">
            {/* Verification Status */}
            <Card className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 border-emerald-500/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-4">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Ticket Verified ✓</h2>
                  <p className="text-emerald-300 text-lg">This ticket is authentic and valid</p>
                  {ticketData.isUsed && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                      <Shield className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-300 font-medium">Ticket Already Used</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Details */}
            {eventData && (
              <Card className="bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TicketIcon className="w-6 h-6 text-purple-400" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-emerald-400 mt-1" />
                    <div>
                      <p className="text-slate-400 text-sm">Event Name</p>
                      <p className="text-white font-semibold text-lg">{eventData.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-400 mt-1" />
                    <div>
                      <p className="text-slate-400 text-sm">Description</p>
                      <p className="text-white">{eventData.description}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-emerald-400 mt-1" />
                    <div>
                      <p className="text-slate-400 text-sm">Event Date</p>
                      <p className="text-white">{new Date(eventData.eventDate).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TicketIcon className="w-5 h-5 text-emerald-400 mt-1" />
                    <div>
                      <p className="text-slate-400 text-sm">Ticket Price</p>
                      <p className="text-white font-semibold">{eventData.ticketPrice} ETH</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendee Info */}
            <Card className="bg-slate-800/50 border-emerald-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-6 h-6 text-emerald-400" />
                  Attendee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm">Attendee Name</p>
                  <p className="text-white font-semibold text-lg">{ticketData.attendeeName}</p>
                </div>

                <div>
                  <p className="text-slate-400 text-sm">Wallet Address</p>
                  <p className="text-white font-mono text-sm break-all">{ticketData.owner}</p>
                </div>

                <div>
                  <p className="text-slate-400 text-sm">Ticket Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${ticketData.isUsed ? 'bg-yellow-400' : 'bg-emerald-400'}`}></div>
                    <p className={`font-medium ${ticketData.isUsed ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {ticketData.isUsed ? 'Used' : 'Valid & Unused'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Blockchain Info */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <p className="text-white font-semibold">Verified on Ethereum Blockchain</p>
                </div>
                <p className="text-slate-400 text-sm">
                  This ticket has been cryptographically verified on the Sepolia testnet. 
                  All ticket data is immutably stored on the blockchain, ensuring authenticity and preventing fraud.
                </p>
              </CardContent>
            </Card>

            {/* Action Button */}
            <div className="text-center pt-4">
              <Button 
                onClick={() => setLocation('/')}
                className="bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600 text-white px-8 py-6 text-lg"
              >
                Back to Home
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-red-500/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Invalid Ticket</h2>
                <p className="text-red-400 mb-6">This ticket could not be verified on the blockchain</p>
                <Button 
                  onClick={() => setLocation('/')}
                  className="bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
