import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Ticket, Mail, Lock, ArrowLeft, Loader2, LogIn, Sparkles, Shield } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localAuth } from '@/lib/local-auth';
import { useToast } from '@/hooks/use-toast';

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
      // Use local auth if Supabase is not configured
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

      // Use Supabase auth
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
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

        {/* Login Card */}
        <Card className="bg-slate-900/50 backdrop-blur-2xl border-slate-800/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-8">
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
                Welcome Back
              </CardTitle>
              <CardDescription className="text-slate-400 text-base">
                Login to your organizer account
              </CardDescription>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300 font-medium">Secured by Blockchain</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="pl-12 h-12 bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                    required
                  />
                </div>
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
                    className="pl-12 h-12 bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                    }
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Login to Dashboard
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
                  New to BlockTix?
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-3">
                Don't have an organizer account?
              </p>
              <Button
                onClick={() => setLocation('/signup')}
                variant="outline"
                className="w-full h-12 border-2 border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 font-bold transition-all"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Create Organizer Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            Looking for user account?{' '}
            <button
              onClick={() => setLocation('/user-login')}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              User Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
