import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';

const SUPPORT_CREDENTIALS = {
  email: 'support@eventchain.com',
  password: 'support@2026',
  securityCode: '9999',
};

export default function SupportLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({ email: '', password: '', securityCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 600)); // brief loading effect

    if (
      form.email.trim().toLowerCase() !== SUPPORT_CREDENTIALS.email ||
      form.password !== SUPPORT_CREDENTIALS.password ||
      form.securityCode !== SUPPORT_CREDENTIALS.securityCode
    ) {
      setError('Invalid credentials or security code. Access denied.');
      setAttempts(a => a + 1);
      setLoading(false);
      return;
    }

    // Store session
    localStorage.setItem('supportSession', JSON.stringify({
      loggedIn: true,
      email: form.email,
      loginAt: new Date().toISOString(),
    }));

    toast({ title: 'Access Granted', description: 'Welcome to the Support Team Dashboard.' });
    setLocation('/support-dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      {/* Back Button — fixed top-left like screenshot */}
      <button
        onClick={() => setLocation('/')}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background/80 backdrop-blur text-sm text-white hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Go back
      </button>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/30 mb-4">
            <Shield className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Support Portal</h1>
          <p className="text-muted-foreground mt-2">Restricted access — support team only</p>
          <Badge className="mt-3 bg-green-500/10 text-green-400 border-green-500/30">
            🔐 Secure Login
          </Badge>
        </div>

        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-400" />
              Team Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Support Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="support@eventchain.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="h-11 bg-muted border-border text-white placeholder:text-muted-foreground/50 focus:border-green-500 focus-visible:ring-green-500/20"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="h-11 bg-muted border-border text-white placeholder:text-muted-foreground/50 focus:border-green-500 focus-visible:ring-green-500/20 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Security Code */}
              <div className="space-y-2">
                <Label htmlFor="securityCode" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Security Code
                </Label>
                <div className="relative">
                  <Input
                    id="securityCode"
                    type={showCode ? 'text' : 'password'}
                    placeholder="• • • •"
                    maxLength={4}
                    value={form.securityCode}
                    onChange={e => setForm(f => ({ ...f, securityCode: e.target.value.replace(/\D/g, '') }))}
                    className="h-11 bg-muted border-border text-white placeholder:text-muted-foreground/50 focus:border-green-500 focus-visible:ring-green-500/20 text-center tracking-[0.4em] text-xl font-bold pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Enter your 4-digit team security code</p>
              </div>

              {/* Error */}
              {error && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Access Dashboard
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Unauthorized access is strictly prohibited and will be logged.
        </p>
      </div>
    </div>
  );
}
