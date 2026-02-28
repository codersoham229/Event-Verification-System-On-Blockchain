import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Mail, Lock, User, Loader2, CheckCircle, Sparkles, LogIn } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';
import { BackgroundPathsDecoration } from '@/components/ui/background-paths-decoration';
import { ApprovedAdsBar } from '@/components/approved-ads-bar';

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        try {
          const user = localAuth.signup(formData.email, formData.password, formData.name, 'organizer');
          localAuth.setCurrentUser(user);

          toast({
            title: "Account Created! 🎉",
            description: "Your organizer account has been successfully created.",
            duration: 3000
          });

          setTimeout(() => {
            setLocation('/home');
          }, 1000);
          return;
        } catch (error: any) {
          if (error.message === 'Email already registered') {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Redirecting to login...",
            });
            setTimeout(() => {
              setLocation('/login');
            }, 1500);
            return;
          }
          throw error;
        }
      }

      const { data: existingAuth } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (existingAuth?.user) {
        await supabase.auth.signOut();
        toast({
          title: "Account Exists",
          description: "This email is already registered. Redirecting to login...",
        });
        setTimeout(() => {
          setLocation('/login');
        }, 1500);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'organizer'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            wallet_address: data.user.id,
            username: formData.name,
            email: formData.email,
            role: 'organizer'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        toast({
          title: "Account Created! 🎉",
          description: "Your organizer account has been successfully created.",
          duration: 5000
        });

        setTimeout(() => {
          setLocation('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create Organizer Account</h1>
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <button onClick={() => setLocation('/login')} className="text-primary hover:underline font-bold">
                Sign in.
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background ${errors.name ? 'border-destructive focus:ring-destructive' : ''}`}
                  required
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-destructive font-medium">{errors.name}</p>}
            </div>

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
                  className={`w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                  required
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-destructive font-medium">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                    required
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive font-medium">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Confirm
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 h-12 rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/30 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-primary/50 focus:border-primary focus:bg-background ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : ''}`}
                    required
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-destructive font-medium">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-primary font-medium leading-relaxed">
                By creating an account, you'll be able to create events, manage tickets, and access real-time blockchain-verified analytics.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-primary text-lg font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Create Organizer Account
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-border flex flex-col gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              Looking for user account?{' '}
              <button
                onClick={() => setLocation('/user-signup')}
                className="text-primary font-bold hover:underline transition-colors"
              >
                User Signup
              </button>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground font-medium uppercase tracking-widest">
            By signing up, you agree to our{" "}
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
