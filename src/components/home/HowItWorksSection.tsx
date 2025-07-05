import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, CreditCard, BarChart3 } from 'lucide-react';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';

interface HowItWorksSectionProps {
  isMobile: boolean;
}

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ isMobile }) => {
  return (
    <section id="how-it-works" className="bg-background">
      <ResponsiveContainer variant="section" maxWidth="6xl">
        <header className="text-center mb-10">
          <ResponsiveTypography variant="h2" className="mb-3">
            How MuniNow Works
          </ResponsiveTypography>
          <ResponsiveTypography variant="body" className="text-muted-foreground max-w-3xl mx-auto">
            Our platform connects residents and businesses to municipalities for a seamless bill payment experience.
          </ResponsiveTypography>
        </header>

        <div className={`grid md:grid-cols-3 ${isMobile ? 'gap-4' : 'gap-6'}`}>
          <Card className="bg-card overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className={`${isMobile ? 'p-4' : 'p-5'} flex flex-col items-center text-center`}>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <ResponsiveTypography variant="h4" className="mb-2">
                Pay All Bills in One Place
              </ResponsiveTypography>
              <ResponsiveTypography variant="small" className="text-muted-foreground">
                Residents can view and pay all municipal bills on a single dashboard. No more jumping between different platforms.
              </ResponsiveTypography>
            </CardContent>
          </Card>
          
          <Card className="bg-card overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className={`${isMobile ? 'p-4' : 'p-5'} flex flex-col items-center text-center`}>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarClock className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <ResponsiveTypography variant="h4" className="mb-2">
                Schedule Automatic Payments
              </ResponsiveTypography>
              <ResponsiveTypography variant="small" className="text-muted-foreground">
                Set up recurring payments for regular bills, ensuring nothing is ever missed or late again.
              </ResponsiveTypography>
            </CardContent>
          </Card>
          
          <Card className="bg-card overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className={`${isMobile ? 'p-4' : 'p-5'} flex flex-col items-center text-center`}>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <ResponsiveTypography variant="h4" className="mb-2">
                Detailed Reporting
              </ResponsiveTypography>
              <ResponsiveTypography variant="small" className="text-muted-foreground">
                Municipalities get powerful analytics and reporting tools to track payments and manage budgets effectively.
              </ResponsiveTypography>
            </CardContent>
          </Card>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default HowItWorksSection;