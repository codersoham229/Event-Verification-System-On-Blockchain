import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, Mail, Lock, User, ArrowLeft, Loader2, CheckCircle, AlertCircle, Sparkles, Shield, Award } from 'lucide-react';
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
      // Use local auth if Supabase is not configured
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

      // Check if account already exists with Supabase
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

      // New user signup with Supabase
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
        // Create user profile in our database
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6 text-white hover:text-blue-400 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {/* Sign Up Card */}
        <Card className="bg-slate-900/50 backdrop-blur-2xl border-slate-800/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-6">
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-60"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl">
                  <Ticket className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
            
            <div>
              <CardTitle className="text-3xl font-black text-white mb-2">
                Create Organizer Account
              </CardTitle>
              <CardDescription className="text-slate-400 text-base">
                Join BlockTix and start managing events on the blockchain
              </CardDescription>
            </div>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Blockchain Security', 'Zero Fraud', 'Global Reach'].map((benefit, index) => (
                <div key={index} className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <CheckCircle className="h-3 w-3 text-blue-400" />
                  <span className="text-xs text-blue-300 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-semibold">
                  Full Name
                </Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`pl-12 h-12 bg-slate-700 border-slate-500 border-2 text-white placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all ${
                      errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-semibold">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="organizer@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`pl-12 h-12 bg-slate-700 border-slate-500 border-2 text-white placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all ${
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-semibold">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`pl-12 h-12 bg-slate-700 border-slate-500 border-2 text-white placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all ${
                      errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''
                    }`}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-semibold">
                  Confirm Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`pl-12 h-12 bg-slate-700 border-slate-500 border-2 text-white placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all ${
                      errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''
                    }`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Info Alert */}
              <Alert className="bg-slate-700 border-slate-500 border-2">
                <Award className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-white font-medium text-sm">
                  As an organizer, you'll create events, manage tickets, and track real-time analytics.
                </AlertDescription>
              </Alert>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Organizer Account
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-slate-900/50 text-slate-500 uppercase tracking-wider">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <Button
                onClick={() => setLocation('/login')}
                variant="outline"
                className="w-full h-12 bg-slate-700 border-slate-500 border-2 hover:border-blue-400 hover:bg-slate-600 text-white hover:text-blue-300 font-semibold transition-all"
              >
                Login to Existing Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
