import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export const HeroSection = () => {
  const benefits = [
    "Secure Payments",
    "Easy Setup", 
    "24/7 Support",
    "Interoperable"
  ];

  return (
    <section className="bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-primary">Simplified Municipal</span>
              <br />
              <span className="text-primary">Bill Pay</span>{' '}
              <span className="text-foreground">for Everyone</span>
            </h1>
            
            {/* Supporting description */}
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              One platform for all your bills, designed for residents, businesses, and administrators. 
              Pay securely, schedule automatically, and never miss a payment again.
            </p>
            
            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button size="lg" className="px-8 py-3 text-base font-semibold min-w-[160px]">
                  Get Started
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="px-8 py-3 text-base min-w-[160px]">
                  Schedule a Demo
                </Button>
              </Link>
            </div>

            {/* Benefits checklist */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop&crop=center"
                alt="Person using laptop for municipal bill payments"
                className="w-full h-[500px] object-cover"
                loading="eager"
              />
              {/* Gradient overlay for better contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};