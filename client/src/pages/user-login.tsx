import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';
import { BackgroundPathsDecoration } from '@/components/ui/background-paths-decoration';
import { ApprovedAdsBar } from '@/components/approved-ads-bar';

export default function UserLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        const user = localAuth.login(email, password);
        localAuth.setCurrentUser(user);

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        toast({
          title: "Welcome Back! 👋",
          description: "Login successful.",
          duration: 3000
        });

        setTimeout(() => {
          setLocation('/user-dashboard');
        }, 1000);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        toast({
          title: "Welcome Back! 👋",
          description: "Login successful.",
          duration: 3000
        });

        // Wait a bit for auth state to propagate before redirecting
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to user dashboard
        setLocation('/user-dashboard');
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Invalid credentials.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast({
        title: "Reset Email Sent",
        description: "Check your inbox for password reset instructions.",
        duration: 5000
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send reset email.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-primary/30 relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <ApprovedAdsBar />
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => setLocation('/')}
          className="relative z-0 flex items-center justify-center gap-2 overflow-hidden rounded-md border border-border bg-card px-4 py-2 font-semibold text-foreground transition-all duration-500 hover:scale-105 hover:text-primary active:scale-95"
        >
          <ChevronLeft size={16} />
          <span>Go back</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.25, ease: "easeInOut" }}
        className="relative z-10 mx-auto w-full max-w-xl p-4"
      >
        {/* Transparent Card Wrapper */}
        <div className="bg-card/40 backdrop-blur-xl border border-border hover:border-primary/50 transition-all duration-500 shadow-glow shadow-primary/10 rounded-2xl p-8">
          <div className="mb-6 flex justify-center items-center">
            <div className="bg-primary/20 p-2 rounded-lg border border-primary/30 shadow-glow shadow-primary/10">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <span className="ml-2 text-3xl font-semibold font-bitcount tracking-normal">
              <span className="text-white">BLOCK</span>
              <span className="text-primary">TIX</span>
            </span>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">User Sign In</h1>
            <p className="text-muted-foreground">
              Don't have a user account?{" "}
              <button onClick={() => setLocation('/user-signup')} className="text-primary hover:underline font-bold">
                Sign up.
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary/50"
              />
              <label htmlFor="remember" className="ml-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-primary text-lg font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In to Account
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-border flex flex-col gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              Are you an organizer?{' '}
              <button
                onClick={() => setLocation('/login')}
                className="text-primary font-bold hover:underline transition-colors"
              >
                Organizer Login
              </button>
            </p>
          </div>
        </div>
        {/* End of transparent card wrapper */}
      </motion.div>
      <BackgroundPathsDecoration />
    </div>
  );
}

const BackgroundDecoration: React.FC = () => {
  return (
    <div
      className="absolute right-0 top-0 z-0 size-[50vw] pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='2' stroke='rgb(79 70 229 / 0.4)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(100% 100% at 100% 0%, rgba(9,9,11,0), rgba(9,9,11,1))",
        }}
      />
    </div>
  )
}
