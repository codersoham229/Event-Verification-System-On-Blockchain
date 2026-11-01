import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, ArrowLeft, Info } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function SupportLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError(
          'Supabase backend authentication is not configured in this environment. ' +
          'Support portal access requires a live Supabase project with authenticated support staff accounts.'
        );
        setLoading(false);
        return;
      }

      // Authenticate against Supabase Auth (no hardcoded credentials)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (authError || !data.user) {
        setError(authError?.message || 'Invalid support credentials. Access denied.');
        setLoading(false);
        return;
      }

      // Never trust user-editable user_metadata for privileged authorization.
      // Only trust server-managed app_metadata or the database user_profiles table.
      const appRole = data.user.app_metadata?.role;
      let authorized = appRole === 'support' || appRole === 'admin';

      if (!authorized) {
        // Query user_profiles table for role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('wallet_address', data.user.id)
          .maybeSingle();

        if (profile?.role === 'support' || profile?.role === 'admin') {
          authorized = true;
        }
      }

      if (!authorized) {
        // Explicitly revoke session if user has a valid Supabase account but lacks support role
        await supabase.auth.signOut();
        setError(
          'Access Denied: Your account does not possess support or administrative privileges. ' +
          'A server-side role assignment ("support" or "admin") is required.'
        );
        setLoading(false);
        return;
      }

      toast({
        title: 'Access Granted',
        description: `Authenticated as Support Staff (${data.user.email}).`,
      });
      setLocation('/support-dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      {/* Back Button */}
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
          <p className="text-muted-foreground mt-2">Restricted access — authorized support team only</p>
          <Badge className="mt-3 bg-green-500/10 text-green-400 border-green-500/30">
            🔐 Supabase Auth Protected
          </Badge>
        </div>

        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-400" />
              Support Authentication
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
                    placeholder="Enter your support password"
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

              {/* Error */}
              {error && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400 text-xs leading-relaxed">{error}</AlertDescription>
                </Alert>
              )}

              {/* Notice */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Role Verification Notice</span>
                </div>
                <p>
                  Accounts must have the <code className="text-cyan-400">support</code> or <code className="text-cyan-400">admin</code> role assigned in Supabase. Non-privileged accounts will be denied entry.
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base transition-colors"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating Session...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Sign In to Support
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Access is monitored. All support actions are tied to verified credentials.
        </p>
      </div>
    </div>
  );
}
