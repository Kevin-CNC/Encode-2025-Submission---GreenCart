import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Shield, Zap, TrendingUp } from 'lucide-react';
import { useEffect, useRef, memo } from 'react';

// Memoize feature cards to prevent unnecessary re-renders
const FeatureCard = memo(({ feature, index }: { feature: any; index: number }) => (
  <Card
    className="border-border/50 bg-card/50 backdrop-blur transition-all duration-500 hover:scale-105 hover:shadow-glow hover:border-primary/50 animate-fade-scale group"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    <CardHeader>
      <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`} aria-hidden="true">
        <feature.icon className="h-6 w-6 text-white" />
      </div>
      <CardTitle className="font-header text-base sm:text-lg">{feature.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <CardDescription className="text-sm">{feature.description}</CardDescription>
    </CardContent>
  </Card>
));

FeatureCard.displayName = 'FeatureCard';

export default function LoginPrompt() {
  const { login, isLoggingIn } = useInternetIdentity();
  const cosmicBgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cosmicBgRef.current) return;

    const colors = [
      'rgba(34, 197, 94, 0.2)',
      'rgba(16, 185, 129, 0.2)',
      'rgba(5, 150, 105, 0.2)',
      'rgba(6, 182, 212, 0.2)',
      'rgba(20, 184, 166, 0.2)',
      'rgba(52, 211, 153, 0.2)',
    ];

    const createBall = () => {
      if (!cosmicBgRef.current) return;
      
      const ball = document.createElement('div');
      ball.className = 'cosmic-ball';
      
      // Responsive sizing based on viewport
      const baseSize = window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 120 : 150;
      const size = Math.random() * baseSize + baseSize;
      ball.style.width = `${size}px`;
      ball.style.height = `${size}px`;
      ball.style.left = `${Math.random() * 100}%`;
      ball.style.background = colors[Math.floor(Math.random() * colors.length)];
      
      // Varied animation duration for more organic movement
      const duration = Math.random() * 12 + 18;
      ball.style.animationDuration = `${duration}s`;
      ball.style.animationDelay = `${Math.random() * 3}s`;
      
      // Add slight horizontal drift
      const drift = (Math.random() - 0.5) * 30;
      ball.style.setProperty('--drift', `${drift}px`);
      
      cosmicBgRef.current?.appendChild(ball);
      
      setTimeout(() => {
        ball.remove();
      }, duration * 1000);
    };

    // Create initial balls
    const initialBallCount = window.innerWidth < 640 ? 4 : window.innerWidth < 1024 ? 6 : 8;
    for (let i = 0; i < initialBallCount; i++) {
      setTimeout(createBall, i * 500);
    }

    // Continuous ball creation with responsive interval
    const interval = window.innerWidth < 640 ? 3000 : 2000;
    const ballInterval = setInterval(createBall, interval);

    return () => {
      clearInterval(ballInterval);
    };
  }, []);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
    }
  };

  const features = [
    {
      icon: Wallet,
      title: 'Multi-Currency Support',
      description: 'Accept BTC, ETH, ICP, and PLT with automatic conversion using real-time HyperSync rates',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'Secure & Simple',
      description: 'Shared backend with strict data isolation. Zero configuration required - no canister IDs or API keys to manage',
      gradient: 'from-teal-500 to-cyan-500',
    },
    {
      icon: Zap,
      title: 'Instant Integration',
      description: 'One-click Shopify installation with automatic merchant onboarding and QR code payments',
      gradient: 'from-emerald-500 to-green-600',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Analytics',
      description: 'Track transactions, monitor live exchange rates from shared backend, and export data',
      gradient: 'from-lime-500 to-green-500',
    },
  ];

  const steps = [
    {
      step: 1,
      title: 'Connect Your Wallet',
      description: 'Authenticate securely using Internet Identity - automatic merchant onboarding',
    },
    {
      step: 2,
      title: 'Configure Settings',
      description: 'Set up your preferred currencies - shared backend handles all API keys and credentials',
    },
    {
      step: 3,
      title: 'Start Accepting Payments',
      description: 'One-click Shopify installation with live conversion rates from shared backend',
    },
  ];

  return (
    <>
      <div ref={cosmicBgRef} className="cosmic-bg" aria-hidden="true" />
      <div className="container py-8 sm:py-12 relative z-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-12 text-center animate-fade-scale">
            <img
              src="/assets/GreenCartLul.png"
              alt="GreenCart - Greenlight crypto in your shop"
              className="mx-auto mb-6 sm:mb-8 rounded-2xl shadow-2xl hover:shadow-glow-lg transition-all duration-500 hover:scale-105 animate-float max-w-full h-auto"
              loading="eager"
            />
            <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-header animate-gradient px-4">
              GreenCart
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-primary mb-4 px-4 font-header">
              Greenlight crypto in your shop!
            </p>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 animate-slide-up px-4">
              Zero-configuration crypto payments with our shared backend. No canister IDs, no API keys - just install and start accepting BTC, ETH, ICP, and PLT.
            </p>
            <Button
              size="lg"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 transition-all duration-300 hover:scale-110 hover:shadow-glow-lg animate-bounce-in animate-gradient focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={isLoggingIn ? 'Connecting to wallet' : 'Connect to get started'}
            >
              {isLoggingIn ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" aria-hidden="true" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-5 w-5" aria-hidden="true" />
                  Connect to Get Started
                </>
              )}
            </Button>
          </div>

          <section aria-label="Features">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 px-4 sm:px-0">
              {features.map((feature, index) => (
                <FeatureCard key={index} feature={feature} index={index} />
              ))}
            </div>
          </section>

          <section className="mt-8 sm:mt-12 animate-slide-up px-4 sm:px-0" style={{ animationDelay: '0.4s' }} aria-label="How it works">
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-glow transition-all duration-500">
              <CardHeader>
                <CardTitle className="font-header text-xl sm:text-2xl">How It Works</CardTitle>
                <CardDescription className="text-sm sm:text-base">Get started in three simple steps - no backend configuration needed</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-3" aria-label="Setup steps">
                  {steps.map((item, index) => (
                    <li
                      key={index}
                      className="flex flex-col items-center text-center group animate-bounce-in"
                      style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                    >
                      <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xl sm:text-2xl font-bold text-primary-foreground transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 group-hover:shadow-glow" aria-hidden="true">
                        {item.step}
                      </div>
                      <h3 className="mb-2 font-semibold font-header text-base sm:text-lg">{item.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
