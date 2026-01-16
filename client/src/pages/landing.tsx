import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket, Shield, Zap, Globe, CheckCircle, ArrowRight, Sparkles, Lock, Users, 
  BarChart3, UserCircle, TrendingUp, Award, Rocket, Star, ChevronRight, Play,
  QrCode, Code2, Clock, DollarSign, AlertCircle
} from 'lucide-react';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [badgeScale, setBadgeScale] = useState(1);

  const fullText = 'BlockTix';

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Typing animation for BlockTix
  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timer = setTimeout(() => {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }, 150);
      return () => clearTimeout(timer);
    } else {
      const cursorTimer = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 530);
      return () => clearInterval(cursorTimer);
    }
  }, [typedText, fullText]);

  // Badge pulse animation
  useEffect(() => {
    const timer = setInterval(() => {
      setBadgeScale(prev => prev === 1 ? 1.05 : 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'Military-grade encryption on Ethereum blockchain with immutable records.',
      color: 'from-blue-500 to-cyan-500',
      gradient: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
    },
    {
      icon: QrCode,
      title: 'Instant Verification',
      description: 'Real-time QR code scanning with sub-second validation at entry points.',
      color: 'from-purple-500 to-pink-500',
      gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Create and distribute thousands of tickets in seconds, not hours.',
      color: 'from-orange-500 to-red-500',
      gradient: 'bg-gradient-to-br from-orange-500/20 to-red-500/20'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Real-time dashboards with insights on sales, attendance, and revenue.',
      color: 'from-green-500 to-emerald-500',
      gradient: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
    }
  ];

  const benefits = [
    { icon: Lock, text: 'Zero fraud guarantee' },
    { icon: Globe, text: 'Global accessibility' },
    { icon: DollarSign, text: 'Lower transaction fees' },
    { icon: Clock, text: 'Instant transfers' },
    { icon: Code2, text: 'Smart contracts' },
    { icon: AlertCircle, text: 'Full transparency' }
  ];

  const stats = [
    { label: 'Active Organizers', value: '10K+', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { label: 'Tickets Issued', value: '500K+', icon: Ticket, color: 'from-purple-500 to-pink-500' },
    { label: 'Countries', value: '50+', icon: Globe, color: 'from-green-500 to-emerald-500' },
    { label: 'Uptime', value: '99.9%', icon: Award, color: 'from-orange-500 to-red-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          transform: `translateY(${scrollY * 0.5}px)`
        }}></div>
        
        {/* Animated Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setLocation('/')}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2.5 rounded-xl">
                  <Ticket className="h-7 w-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  BlockTix
                </h1>
                <p className="text-xs text-slate-400 font-medium">Blockchain Ticketing</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => setLocation('/login')}
                className="text-slate-300 hover:text-white hover:bg-white/10 font-semibold"
              >
                Login
              </Button>
              <Button
                onClick={() => setLocation('/signup')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
              >
                Get Started
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Main Hero Content */}
          <div className="text-center mb-16">
            <Badge 
              className="mb-6 px-5 py-3 bg-gradient-to-r from-blue-600/40 via-purple-600/40 to-pink-600/40 border-2 border-blue-400/60 backdrop-blur-xl shadow-2xl shadow-blue-500/30 transition-all duration-500 hover:scale-110 hover:shadow-blue-500/50 animate-float"
              style={{ transform: `scale(${badgeScale})` }}
            >
              <Sparkles className="mr-2 h-5 w-5 text-yellow-400 animate-pulse" />
              <span className="font-bold text-base text-white">Powered by Ethereum Blockchain</span>
              <Shield className="ml-2 h-5 w-5 text-green-400" />
            </Badge>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {typedText}
                <span className={`inline-block w-1 h-16 md:h-20 lg:h-24 bg-gradient-to-b from-blue-400 to-purple-500 ml-2 ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity`}></span>
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-slate-200 font-bold mb-4">
              Next-Gen Event Ticketing
            </p>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Create, distribute, and verify blockchain-secured tickets with zero fraud. 
              <span className="block mt-2 text-blue-400 font-semibold">
                Instant verification • Global reach • Complete transparency
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                size="lg"
                onClick={() => setLocation('/signup')}
                className="group relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-lg px-10 py-7 shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-300 overflow-hidden hover:scale-105 animate-float"
              >
                <span className="relative z-10 flex items-center">
                  <Rocket className="mr-2 h-5 w-5 animate-bounce" />
                  Start as Organizer
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
              
              <Button
                size="lg"
                onClick={() => setLocation('/user-signup')}
                className="group relative bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 hover:from-emerald-700 hover:via-cyan-700 hover:to-blue-700 text-white font-bold text-lg px-10 py-7 shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all duration-300 overflow-hidden hover:scale-105 animate-float"
                style={{ animationDelay: '0.5s' }}
              >
                <span className="relative z-10 flex items-center">
                  <UserCircle className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Join as User
                  <Sparkles className="ml-2 h-5 w-5 text-yellow-300 group-hover:scale-125 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:scale-105"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-12">
            {[
              'Web3 Compatible',
              'Smart Contract Verified',
              'Open Source',
              'Decentralized',
              'Secure by Design'
            ].map((badge, index) => (
              <div key={index} className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-300 font-medium">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 text-purple-300">
              <Star className="mr-2 h-4 w-4" />
              Premium Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Everything You Need
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Enterprise-grade tools for modern event management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className={`group relative bg-slate-900/50 backdrop-blur-xl border-slate-800/50 hover:border-blue-500/50 transition-all duration-500 overflow-hidden ${
                  activeFeature === index ? 'ring-2 ring-blue-500/50 scale-105' : ''
                }`}
              >
                <div className={`absolute inset-0 ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <CardContent className="relative p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30 text-green-300">
                <CheckCircle className="mr-2 h-4 w-4" />
                Why BlockTix
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Built for Scale & Security
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Revolutionary blockchain technology meets intuitive event management. 
                Experience unmatched security, transparency, and reliability at every step.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl hover:border-blue-500/50 transition-all group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <benefit.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm text-slate-300 font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => setLocation('/signup')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-6 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="grid gap-4">
                {[
                  {
                    icon: Lock,
                    title: 'Blockchain Verified',
                    desc: 'Immutable & tamper-proof',
                    color: 'from-green-500 to-emerald-500'
                  },
                  {
                    icon: Globe,
                    title: 'Global Access',
                    desc: 'Worldwide events, zero barriers',
                    color: 'from-blue-500 to-cyan-500'
                  },
                  {
                    icon: Zap,
                    title: 'Instant Verification',
                    desc: 'Real-time in seconds',
                    color: 'from-yellow-500 to-orange-500'
                  },
                  {
                    icon: Shield,
                    title: 'Zero Fraud',
                    desc: 'Cryptographically secured',
                    color: 'from-purple-500 to-pink-500'
                  }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl hover:border-blue-500/50 transition-all hover:scale-105 group"
                  >
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-xl`}>
                      <item.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-lg mb-1">{item.title}</div>
                      <div className="text-sm text-slate-400">{item.desc}</div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-indigo-950/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30 text-blue-300">
              <Play className="mr-2 h-4 w-4" />
              Simple Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-0"></div>
            
            {[
              {
                step: '01',
                title: 'Create Event',
                description: 'Set up your event with all details, pricing, and ticket limits in minutes',
                icon: Ticket,
                color: 'from-blue-500 to-cyan-500'
              },
              {
                step: '02',
                title: 'Mint Tickets',
                description: 'Generate blockchain-secured NFT tickets for your attendees automatically',
                icon: Shield,
                color: 'from-purple-500 to-pink-500'
              },
              {
                step: '03',
                title: 'Verify Entry',
                description: 'Scan QR codes to verify tickets instantly at your event entrance',
                icon: CheckCircle,
                color: 'from-green-500 to-emerald-500'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all hover:scale-105 group">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-6xl font-black text-slate-800 group-hover:text-slate-700 transition-colors">{item.step}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-400/30 text-emerald-300">
              <Star className="mr-2 h-4 w-4" />
              Perfect For
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Trusted Across Industries
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              From concerts to conferences, BlockTix powers events of all sizes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Concerts & Music Festivals',
                description: 'Large-scale events with thousands of attendees and zero counterfeit tickets',
                color: 'from-pink-500 to-rose-500',
                examples: '10K+ events'
              },
              {
                icon: Award,
                title: 'Corporate Events',
                description: 'Professional conferences, seminars, and networking events with VIP access control',
                color: 'from-blue-500 to-indigo-500',
                examples: '5K+ companies'
              },
              {
                icon: Ticket,
                title: 'Sports Events',
                description: 'Stadium events, tournaments, and competitions with dynamic pricing',
                color: 'from-orange-500 to-red-500',
                examples: '2K+ venues'
              },
              {
                icon: Sparkles,
                title: 'Art Exhibitions',
                description: 'Gallery shows, museum events, and cultural experiences',
                color: 'from-purple-500 to-pink-500',
                examples: '1K+ galleries'
              },
              {
                icon: Globe,
                title: 'Virtual Events',
                description: 'Online webinars, workshops, and digital conferences worldwide',
                color: 'from-cyan-500 to-blue-500',
                examples: '15K+ virtual'
              },
              {
                icon: TrendingUp,
                title: 'Private Events',
                description: 'Exclusive parties, fundraisers, and community gatherings',
                color: 'from-emerald-500 to-green-500',
                examples: '8K+ private'
              }
            ].map((useCase, index) => (
              <Card 
                key={index}
                className="group bg-slate-900/50 backdrop-blur-xl border-slate-800/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${useCase.color} mb-4 shadow-xl group-hover:scale-110 transition-transform`}>
                    <useCase.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{useCase.title}</h3>
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">{useCase.description}</p>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    {useCase.examples}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400/30 text-indigo-300">
              <Code2 className="mr-2 h-4 w-4" />
              Technology
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Built on Cutting-Edge Tech
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Leveraging the power of blockchain and modern web technologies
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Blockchain Layer',
                items: [
                  { name: 'Ethereum Network', desc: 'Mainnet & Sepolia Testnet' },
                  { name: 'Smart Contracts', desc: 'Solidity-based NFT ticketing' },
                  { name: 'Web3 Integration', desc: 'MetaMask & WalletConnect' },
                  { name: 'IPFS Storage', desc: 'Decentralized metadata storage' }
                ]
              },
              {
                title: 'Application Layer',
                items: [
                  { name: 'React & TypeScript', desc: 'Modern frontend framework' },
                  { name: 'Supabase', desc: 'Real-time database & auth' },
                  { name: 'TailwindCSS', desc: 'Responsive UI design' },
                  { name: 'QR Code System', desc: 'Instant ticket verification' }
                ]
              }
            ].map((stack, index) => (
              <Card key={index} className="bg-slate-900/50 backdrop-blur-xl border-slate-800/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    {stack.title}
                  </h3>
                  <div className="space-y-4">
                    {stack.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-all group">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white text-base mb-1">{item.name}</div>
                          <div className="text-sm text-slate-400">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30 text-yellow-300">
              <Star className="mr-2 h-4 w-4" />
              Reviews
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Loved by Event Organizers
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Join thousands who've revolutionized their ticketing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sarah Chen',
                role: 'Music Festival Director',
                comment: 'BlockTix eliminated fraud at our festival. Zero counterfeit tickets and instant verification saved us thousands!',
                rating: 5,
                avatar: '🎵'
              },
              {
                name: 'Michael Rodriguez',
                role: 'Corporate Event Manager',
                comment: 'The blockchain security gave our VIP clients complete confidence. Setup was incredibly easy.',
                rating: 5,
                avatar: '💼'
              },
              {
                name: 'Emily Watson',
                role: 'Sports Venue Owner',
                comment: 'Real-time analytics and fraud prevention have transformed how we manage our stadium events.',
                rating: 5,
                avatar: '⚽'
              }
            ].map((testimonial, index) => (
              <Card 
                key={index}
                className="group bg-slate-900/50 backdrop-blur-xl border-slate-800/50 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed italic">"{testimonial.comment}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-0 shadow-2xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
            <CardContent className="relative p-12 lg:p-16 text-center">
              <div className="mb-6">
                <Sparkles className="h-16 w-16 text-white mx-auto animate-pulse" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of event organizers using BlockTix for secure, transparent, and fraud-free ticketing.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {['No credit card required', 'Setup in 5 minutes', 'Free forever plan'].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                    <CheckCircle className="h-5 w-5 text-white" />
                    <span className="text-white font-semibold">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => setLocation('/signup')}
                  className="bg-white hover:bg-gray-100 text-blue-600 font-black text-xl px-12 py-8 shadow-2xl hover:scale-105 transition-all"
                >
                  <Rocket className="mr-2 h-6 w-6" />
                  Create Free Account
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-12 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black text-white">BlockTix</span>
            </div>
            <p className="text-slate-400 mb-6 max-w-md">
              Blockchain-powered event ticketing for the modern world
            </p>
            <div className="flex gap-2 text-sm text-slate-500">
              <span>© 2025 BlockTix</span>
              <span>•</span>
              <span>Ethereum Network</span>
              <span>•</span>
              <span>Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
