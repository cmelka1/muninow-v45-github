import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';

export const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary/90 to-secondary/90 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-secondary opacity-90"></div>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Social proof badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-white/90 text-sm font-medium">
              Trusted by 10,000+ residents across 500+ municipalities
            </span>
          </div>

          {/* Main headline */}
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Ready to Simplify Your 
            <span className="block">Municipal Payments?</span>
          </h2>
          
          {/* Supporting text */}
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of residents who have ditched the lines and late fees. 
            Start paying your municipal bills the modern way.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/signup">
              <Button 
                size="lg" 
                variant="secondary"
                className="px-8 py-4 text-lg font-semibold min-w-[200px] bg-white text-primary hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-4 text-lg min-w-[200px] border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              >
                Schedule Demo
              </Button>
            </Link>
          </div>

          {/* Risk reversal */}
          <p className="text-white/80 text-sm">
            Free to start • No setup fees • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};