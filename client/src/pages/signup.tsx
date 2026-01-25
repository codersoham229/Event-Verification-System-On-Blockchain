import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Mail, Lock, User, Loader2, CheckCircle, Sparkles, LogIn } from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';

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
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <span className="ml-2 text-2xl font-black tracking-tighter uppercase">BLOCK<span className="text-blue-600">TIX</span></span>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Organizer Account</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <button onClick={() => setLocation('/login')} className="text-blue-600 dark:text-blue-400 hover:underline">
              Sign in.
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Full Name
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full pl-10 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-blue-600 focus:border-blue-600 ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                required
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="organizer@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-blue-600 focus:border-blue-600 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                required
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-blue-600 focus:border-blue-600 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                  required
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Confirm
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-transparent transition-all focus:outline-0 focus:ring-blue-600 focus:border-blue-600 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                  required
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-md p-3 flex gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              By creating an account, you'll be able to create events, manage tickets, and access real-time blockchain-verified analytics.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white ring-2 ring-blue-500/50 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 transition-all hover:scale-[1.02] hover:ring-transparent active:scale-[0.98] active:ring-blue-500/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
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

        <div className="mt-8 text-center pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Looking for user account?{' '}
            <button
              onClick={() => setLocation('/user-signup')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors"
            >
              User Signup
            </button>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          By signing up, you agree to our{" "}
          <a href="#" className="text-blue-600 dark:text-blue-400 font-medium">Terms & Conditions</a>
          {" "}and{" "}
          <a href="#" className="text-blue-600 dark:text-blue-400 font-medium">Privacy Policy</a>
        </p>
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
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='2' stroke='rgb(30 58 138 / 0.5)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
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
