import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ApprovedAdsBar } from '@/components/approved-ads-bar';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Button } from '@/components/ui/neon-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Ticket, Shield, Zap, Globe, CheckCircle, ArrowRight, Sparkles, Lock, Users,
  BarChart3, UserCircle, TrendingUp, Award, Rocket, Star, ChevronRight, Play,
  QrCode, Code2, Clock, DollarSign, AlertCircle, Box, Settings, Search
} from 'lucide-react';
import { BackgroundBeams } from "@/components/ui/background-beams";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { NewHero } from "@/components/NewHero";
import { SimpleHeader } from "@/components/ui/simple-header";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
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
      color: 'from-primary/80 to-primary',
      gradient: 'bg-primary/10 border-primary/20'
    },
    {
      icon: QrCode,
      title: 'Instant Verification',
      description: 'Real-time QR code scanning with sub-second validation at entry points.',
      color: 'from-primary/60 to-primary/40',
      gradient: 'bg-primary/5 border-primary/10'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Create and distribute thousands of tickets in seconds, not hours.',
      color: 'from-primary to-primary/80',
      gradient: 'bg-primary/10 border-primary/20'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Real-time dashboards with insights on sales, attendance, and revenue.',
      color: 'from-primary/90 to-primary/70',
      gradient: 'bg-primary/10 border-primary/20'
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
    { label: 'Active Organizers', value: '10K+', icon: Users, color: 'from-primary/80 to-primary' },
    { label: 'Tickets Issued', value: '500K+', icon: Ticket, color: 'from-primary/60 to-primary' },
    { label: 'Countries', value: '50+', icon: Globe, color: 'from-primary to-primary/70' },
    { label: 'Uptime', value: '99.9%', icon: Award, color: 'from-primary/90 to-primary' }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BackgroundBeams className="opacity-20" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          transform: `translateY(${scrollY * 0.5}px)`
        }}></div>
      </div>


      {/* Navigation */}
      <SimpleHeader />

      <ApprovedAdsBar />
      <AnnouncementBanner />

      <NewHero />

      <section className="relative z-10 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">


            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="relative rounded-2xl p-1 group">
                  <GlowingEffect
                    spread={50}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={2.5}
                  />
                  <div
                    className="relative bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group-hover:scale-[1.02] shadow-glow shadow-primary/5"
                  >
                    <div className={`inline-flex p-3 rounded-xl bg-primary/20 border border-primary/30 mb-3 shadow-glow shadow-primary/10 group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-semibold text-white mb-1 font-bitcount tracking-normal">{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</div>
                  </div>
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
              <div key={index} className="flex items-center gap-2 px-4 py-2 bg-card/40 backdrop-blur-sm border border-border/50 rounded-full shadow-glow shadow-primary/5">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-1.5 bg-primary/20 border-primary/30 text-primary font-bold uppercase tracking-widest text-xs">
              <Star className="mr-2 h-3 w-3" />
              Premium Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-white font-bitcount tracking-normal">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade tools for modern event management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="relative h-full rounded-[1.25rem] p-1">
                <GlowingEffect
                  spread={50}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={2.5}
                />
                <Card
                  className="group relative h-full bg-card/60 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all duration-500 overflow-hidden"
                >
                  <CardContent className="relative p-6 pt-6 text-center">
                    <div className={`inline-flex p-3 rounded-xl bg-primary/20 border border-primary/30 mb-4 shadow-glow shadow-primary/10 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 px-4 py-1.5 bg-primary/20 border-primary/30 text-primary font-bold uppercase tracking-widest text-xs">
                <CheckCircle className="mr-2 h-3 w-3" />
                Why BlockTix
              </Badge>
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white font-bitcount tracking-normal">
                Built for Scale & Security
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Revolutionary blockchain technology meets intuitive event management.
                Experience unmatched security, transparency, and reliability at every step.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl hover:border-primary/50 transition-all group shadow-glow shadow-primary/5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{benefit.text}</span>
                  </div>
                ))}
              </div>

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
                  <div key={index} className="relative rounded-[1.25rem] p-1 group">
                    <GlowingEffect
                      spread={40}
                      glow={true}
                      disabled={false}
                      proximity={64}
                      inactiveZone={0.01}
                      borderWidth={2}
                    />
                    <div
                      className="relative flex items-center gap-4 p-6 bg-card/60 backdrop-blur-xl border border-border/50 rounded-[1.25rem] group-hover:border-primary/50 transition-all group-hover:scale-[1.02] shadow-glow shadow-primary/5"
                    >
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center`}>
                        <item.icon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-lg mb-1">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.desc}</div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-1.5 bg-primary/20 border-primary/30 text-primary font-bold uppercase tracking-widest text-xs">
              <Play className="mr-2 h-3 w-3" />
              Simple Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-white font-bitcount tracking-normal">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 z-0"></div>

            {[
              {
                step: '01',
                title: 'Create Event',
                description: 'Set up your event with all details, pricing, and ticket limits in minutes',
                icon: Ticket,
              },
              {
                step: '02',
                title: 'Mint Tickets',
                description: 'Generate blockchain-secured NFT tickets for your attendees automatically',
                icon: Shield,
              },
              {
                step: '03',
                title: 'Verify Entry',
                description: 'Scan QR codes to verify tickets instantly at your event entrance',
                icon: CheckCircle,
              }
            ].map((item, index) => (
              <div key={index} className="relative rounded-[1.25rem] p-1 group">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={2}
                />
                <div className="relative h-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-[1.25rem] p-8 group-hover:border-primary/50 transition-all group-hover:scale-[1.02] shadow-glow shadow-primary/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-glow shadow-primary/10 group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-6xl font-semibold text-white/5 group-hover:text-primary/10 transition-colors font-bitcount tracking-normal">{item.step}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
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
            <Badge className="mb-4 px-4 py-1.5 bg-primary/20 border-primary/30 text-primary font-bold uppercase tracking-widest text-xs">
              <Star className="mr-2 h-3 w-3" />
              Perfect For
            </Badge>
            <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-white font-bitcount tracking-normal">
              Trusted Across Industries
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From concerts to conferences, BlockTix powers events of all sizes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Concerts & Music Festivals',
                description: 'Large-scale events with thousands of attendees and zero counterfeit tickets',
              },
              {
                icon: Award,
                title: 'Corporate Events',
                description: 'Professional conferences, seminars, and networking events with VIP access control',
              },
              {
                icon: Ticket,
                title: 'Sports Events',
                description: 'Stadium events, tournaments, and competitions with dynamic pricing',
              },
              {
                icon: Sparkles,
                title: 'Art Exhibitions',
                description: 'Gallery shows, museum events, and cultural experiences',
              },
              {
                icon: Globe,
                title: 'Virtual Events',
                description: 'Online webinars, workshops, and digital conferences worldwide',
              },
              {
                icon: TrendingUp,
                title: 'Private Events',
                description: 'Exclusive parties, fundraisers, and community gatherings',
              }
            ].map((useCase, index) => (
              <div key={index} className="relative rounded-[1.25rem] p-1 group">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={2}
                />
                <Card
                  className="relative h-full bg-card/60 backdrop-blur-xl border-border/50 group-hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-glow shadow-primary/5"
                >
                  <CardContent className="p-6 pt-6 text-center">
                    <div className={`inline-flex p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4 shadow-glow shadow-primary/5 group-hover:scale-110 transition-transform`}>
                      <useCase.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{useCase.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section id="technology" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-1.5 bg-primary/20 border-primary/30 text-primary font-bold uppercase tracking-widest text-xs">
              <Code2 className="mr-2 h-3 w-3" />
              Technology
            </Badge>
            <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-white font-bitcount tracking-normal">
              Built on Cutting-Edge Tech
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
              <Card key={index} className="bg-card/40 backdrop-blur-xl border-border/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 font-bitcount tracking-normal">
                    <div className="w-1.5 h-8 bg-primary rounded-full"></div>
                    {stack.title}
                  </h3>
                  <div className="space-y-4">
                    {stack.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-4 bg-background/50 border border-border/30 rounded-xl hover:border-primary/30 transition-all group">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white text-base mb-1">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.desc}</div>
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

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Card className="relative overflow-hidden bg-card/40 backdrop-blur-xl border-border hover:border-primary/50 transition-all duration-500 shadow-glow shadow-primary/10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
            <CardContent className="relative p-12 lg:p-16 text-center">
              <div className="mb-6">
                <Sparkles className="h-16 w-16 text-primary mx-auto animate-pulse" />
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 font-bitcount tracking-normal">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
                Join thousands of event organizers using BlockTix for secure, transparent, and fraud-free ticketing.
              </p>

              <div className="flex flex-wrap justify-center gap-3 mb-10">
                {['No credit card required', 'Setup in 5 minutes', 'Free forever plan'].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/30">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-primary font-bold text-xs uppercase tracking-widest">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center items-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setLocation('/signup')}
                  className="border-border hover:border-primary/50 bg-background/50 hover:bg-card/60 text-white font-bold px-8 py-6 text-base backdrop-blur-sm transition-all rounded-full inline-flex items-center justify-center gap-2"
                >
                  <Rocket className="h-5 w-5" />
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 border border-primary/30 rounded-xl">
                <Ticket className="h-7 w-7 text-primary" />
              </div>
              <span className="text-3xl font-semibold font-bitcount tracking-normal">
                <span className="text-white">BLOCK</span>
                <span className="text-primary">TIX</span>
              </span>
            </div>
            <p className="text-muted-foreground mb-8 max-w-md font-medium">
              Blockchain-powered event ticketing for the modern world.
              Secure. Transparent. Immutable.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              <span>© 2025 BlockTix</span>
              <span className="text-primary/30">•</span>
              <span>Ethereum Network</span>
              <span className="text-primary/30">•</span>
              <span>Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
