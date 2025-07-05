import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Shield, Clock, Users } from 'lucide-react';

export const HeroSection = () => {
  const benefits = [
    "Pay bills 24/7 from anywhere",
    "Bank-level security & encryption", 
    "Instant payment confirmation",
    "Support for all major municipalities"
  ];

  const trustIndicators = [
    { icon: Shield, label: "Bank-Level Security", value: "256-bit SSL" },
    { icon: Users, label: "Trusted Users", value: "10,000+" },
    { icon: Clock, label: "Uptime", value: "99.9%" }
  ];

  return (
    <section className="gradient-bg relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Pay Municipal Bills in
            <span className="block gradient-text">Seconds, Not Hours</span>
          </h1>
          
          {/* Supporting description */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Skip the lines, avoid late fees, and manage all your municipal payments 
            from one secure platform. Water, sewer, utilities – all in one place.
          </p>
          
          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/signup">
              <Button size="lg" className="px-8 py-4 text-lg font-semibold min-w-[200px]">
                Start Paying Bills
              </Button>
            </Link>
            <Link to="/signin">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg min-w-[200px]">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Benefits checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center justify-center md:justify-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-8 border-t border-border/50">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <indicator.icon className="w-4 h-4" />
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{indicator.value}</span>
                  <span className="ml-1">{indicator.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};