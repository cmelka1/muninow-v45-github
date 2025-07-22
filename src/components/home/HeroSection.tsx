import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';
import OptimizedImage from '@/components/ui/optimized-image';

interface HeroSectionProps {
  isMobile: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ isMobile }) => {
  return (
    <section className="gradient-bg">
      <ResponsiveContainer variant="hero" maxWidth="4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <header>
              <ResponsiveTypography variant="h1" className="mb-3">
                <span className="gradient-text">Simplified Municipal</span><br />
                Bill Pay for Everyone
              </ResponsiveTypography>
              <ResponsiveTypography variant="body" className="text-muted-foreground mb-4">
                One platform for all your bills, designed for residents, businesses, and administrators. 
                Pay securely, schedule automatically, and never miss a payment again.
              </ResponsiveTypography>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup" aria-label="Sign up for MuniNow">
                <Button size="lg" className="px-6">Get Started</Button>
              </Link>
              <Link to="/contact" aria-label="Schedule a demo with MuniNow">
                <Button size="lg" variant="outline" className="px-6">
                  Schedule a Demo
                </Button>
              </Link>
            </div>
            
            <div className={`mt-4 grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" aria-hidden="true" />
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Secure Payments
                </ResponsiveTypography>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" aria-hidden="true" />
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Easy Setup
                </ResponsiveTypography>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" aria-hidden="true" />
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  24/7 Support
                </ResponsiveTypography>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" aria-hidden="true" />
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Interoperable
                </ResponsiveTypography>
              </div>
            </div>
          </div>
          <div className="bg-card p-2 rounded-xl shadow-lg border">
            <OptimizedImage
              src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
              alt="MuniNow Dashboard showing simplified municipal bill payment interface"
              width={800}
              height={550}
              className="w-full rounded-lg shadow-md"
              priority={true}
              quality="high"
              loading="eager"
            />
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default HeroSection;
