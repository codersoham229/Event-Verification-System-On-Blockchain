import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';

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
    <div className="bg-white dark:bg-zinc-950 min-h-screen text-zinc-800 dark:text-zinc-200 selection:bg-zinc-300 dark:selection:bg-zinc-600 relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => setLocation('/')}
          className="relative z-0 flex items-center justify-center gap-2 overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300 transition-all duration-500 before:absolute before:inset-0 before:-z-10 before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5] before:rounded-[100%] before:bg-zinc-800 dark:before:bg-zinc-200 before:transition-transform before:duration-1000 before:content-[''] hover:scale-105 hover:text-zinc-100 dark:hover:text-zinc-900 hover:before:translate-x-[0%] hover:before:translate-y-[0%] active:scale-95"
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
        <div className="mb-6 flex justify-center items-center">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <span className="ml-2 text-2xl font-black tracking-tighter uppercase">BLOCK<span className="text-indigo-600">TIX</span></span>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">User Sign In</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Don't have a user account?{" "}
            <button onClick={() => setLocation('/user-signup')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              Sign up.
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-indigo-600 focus:border-indigo-600"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
              >
                Forgot?
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-indigo-600 focus:border-indigo-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-zinc-500 dark:text-zinc-400">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 text-lg font-bold text-white ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 transition-all hover:scale-[1.02] hover:ring-transparent active:scale-[0.98] active:ring-indigo-500/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
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

        <div className="mt-8 text-center pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Are you an organizer?{' '}
            <button
              onClick={() => setLocation('/login')}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-colors"
            >
              Organizer Login
            </button>
          </p>
        </div>
      </motion.div>
      <BackgroundDecoration />
    </div>
  );
}

const BackgroundDecoration: React.FC = () => {
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"

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
          backgroundImage: isDarkTheme
            ? "radial-gradient(100% 100% at 100% 0%, rgba(9,9,11,0), rgba(9,9,11,1))"
            : "radial-gradient(100% 100% at 100% 0%, rgba(255,255,255,0), rgba(255,255,255,1))",
        }}
      />
    </div>
  )
}
