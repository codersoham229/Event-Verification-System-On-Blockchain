import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, Github, Twitter, ShieldCheck, Mail, Lock, Loader2, LogIn, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';
import { BackgroundPathsDecoration } from '@/components/ui/background-paths-decoration';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
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
        const user = localAuth.login(formData.email, formData.password);
        localAuth.setCurrentUser(user);

        if (formData.rememberMe) {
          localStorage.setItem('blocktix_remember', 'true');
        }

        toast({
          title: "Welcome Back! 🎉",
          description: "You have successfully logged in.",
          duration: 3000
        });

        setTimeout(() => {
          setLocation('/home');
        }, 1000);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      if (data.user) {
        if (formData.rememberMe) {
          localStorage.setItem('blocktix_remember', 'true');
        }

        toast({
          title: "Welcome Back! 🎉",
          description: "You have successfully logged in.",
          duration: 3000
        });

        setTimeout(() => {
          setLocation('/home');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
        duration: 5000
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-primary/30 relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-8 left-8 z-20">
        <SocialButton onClick={() => setLocation('/')} icon={<ChevronLeft size={16} />}>Go back</SocialButton>
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

          <h2 className="text-3xl font-bold text-center mb-2 text-white font-bitcount tracking-normal">Login to Dashboard</h2>
          <p className="text-center text-muted-foreground text-sm mb-8 font-medium">
            Don't have an organizer account?{" "}
            <button onClick={() => setLocation('/signup')} className="text-primary hover:underline font-bold">
              Create one.
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="organizer@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
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
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                className="h-4 w-4 rounded border-border bg-transparent text-primary focus:ring-primary/50 focus:ring-offset-0 accent-primary"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign in to Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-border flex flex-col gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              Looking for user account?{' '}
              <button
                onClick={() => setLocation('/user-login')}
                className="text-primary font-bold hover:underline transition-colors"
              >
                User Login
              </button>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground font-medium uppercase tracking-widest">
            By signing in, you agree to our{" "}
            <a href="#" className="text-primary hover:underline font-bold">Terms & Conditions</a>
            {" "}and{" "}
            <a href="#" className="text-primary hover:underline font-bold">Privacy Policy</a>
          </p>
        </div>
      </motion.div>
      <BackgroundPathsDecoration />
    </div>
  );
}

const SocialButton: React.FC<{
  icon?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
  onClick?: () => void
}> = ({ icon, fullWidth, children, onClick }) => (
  <button
    onClick={onClick}
    className={`relative z-0 flex items-center justify-center gap-2 overflow-hidden rounded-lg 
    border border-border bg-card px-4 py-3 font-bold text-foreground transition-all duration-300
    hover:scale-105 hover:text-primary active:scale-95 shadow-glow shadow-primary/5
    ${fullWidth ? "col-span-2" : ""}`}
  >
    {icon}
    <span>{children}</span>
  </button>
)
