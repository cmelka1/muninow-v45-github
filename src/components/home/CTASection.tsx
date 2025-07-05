import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';

const CTASection: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-primary/90 to-secondary/90 text-primary-foreground">
      <ResponsiveContainer variant="section" maxWidth="4xl">
        <div className="text-center">
          <ResponsiveTypography variant="h2" className="mb-4 text-primary-foreground">
            Ready to Simplify Your Municipal Bill Payments?
          </ResponsiveTypography>
          <ResponsiveTypography variant="body" className="opacity-90 mb-6 max-w-2xl mx-auto text-primary-foreground">
            Join hundreds of municipalities and thousands of residents and businesses already using MuniNow for their bill pay needs.
          </ResponsiveTypography>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup" aria-label="Sign up for free MuniNow account">
              <Button size="lg" variant="secondary" className="px-8">
                Sign Up For Free
              </Button>
            </Link>
            <Link to="/contact" aria-label="Schedule a personalized demo">
              <Button size="lg" variant="outline" className="px-8 bg-transparent text-primary-foreground border-primary-foreground hover:bg-background/10">
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default CTASection;