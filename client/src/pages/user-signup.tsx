import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, Sparkles, UserCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';
import { BackgroundPathsDecoration } from '@/components/ui/background-paths-decoration';
import { ApprovedAdsBar } from '@/components/approved-ads-bar';

export default function UserSignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name Required", description: "Please enter your name.", variant: "destructive" });
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        try {
          const user = localAuth.signup(formData.email, formData.password, formData.name, 'user');
          localAuth.setCurrentUser(user);

          toast({ title: "Account Created! 🎉", description: "Welcome to BlockTix." });
          setTimeout(() => setLocation('/user-dashboard'), 1000);
          return;
        } catch (error: any) {
          if (error.message === 'Email already registered') {
            toast({ title: "Account Exists", description: "Redirecting to login..." });
            setTimeout(() => setLocation('/user-login'), 1500);
            return;
          }
          throw error;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name, role: 'user' } }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{ user_id: authData.user.id, email: formData.email, name: formData.name, role: 'user' }]);

        if (profileError) throw profileError;
        toast({ title: "Signup Successful", description: "Please log in." });
        setLocation('/user-login');
      }
    } catch (err: any) {
      toast({ title: "Signup Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create User Account</h1>
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <button onClick={() => setLocation('/user-login')} className="text-primary hover:underline font-bold">
                Sign in.
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
              <div className="relative group">
                <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder-zinc-400 ring-1 ring-transparent focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder-zinc-400 ring-1 ring-transparent focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground ring-1 ring-transparent focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirm</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground ring-1 ring-transparent focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-primary text-lg font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow shadow-primary/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Create Account</>}
            </button>
          </form>

        </div> {/* Closes the bg-card/40 wrapper */}

        <div className="mt-8 text-center pt-6 border-t border-border flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            Are you an organizer?{' '}
            <button onClick={() => setLocation('/signup')} className="text-primary font-bold hover:underline">
              Create organizer account
            </button>
          </p>
        </div>
      </motion.div>
      <BackgroundPathsDecoration />
    </div>
  );
}
