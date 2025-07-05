import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Clock, Wallet } from 'lucide-react';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';
import OptimizedImage from '@/components/ui/optimized-image';

interface FeaturesSectionProps {
  isMobile: boolean;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ isMobile }) => {
  return (
    <section className="bg-muted/30">
      <ResponsiveContainer variant="section" maxWidth="6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge variant="outline" className="mb-3 py-1 px-3 text-primary border-primary/30 bg-primary/5">
              Powerful Features
            </Badge>
            <ResponsiveTypography variant="h2" className="mb-4">
              Streamline Your Bill Pay Process
            </ResponsiveTypography>
            <ResponsiveTypography variant="body" className="text-muted-foreground mb-6">
              MuniNow offers comprehensive tools for both residents, businesses, and municipal administrators to simplify the entire bill payment ecosystem.
            </ResponsiveTypography>
            
            <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <ResponsiveTypography variant="h5" className="mb-1">
                    Secure Payment Processing
                  </ResponsiveTypography>
                  <ResponsiveTypography variant="small" className="text-muted-foreground">
                    Bank-level security encryption for all transactions with multi-factor authentication.
                  </ResponsiveTypography>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <ResponsiveTypography variant="h5" className="mb-1">
                    Multiple User Support
                  </ResponsiveTypography>
                  <ResponsiveTypography variant="small" className="text-muted-foreground">
                    Different access levels for various municipal departments and resident family members.
                  </ResponsiveTypography>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <ResponsiveTypography variant="h5" className="mb-1">
                    Payment History & Reminders
                  </ResponsiveTypography>
                  <ResponsiveTypography variant="small" className="text-muted-foreground">
                    Complete payment history records and automated reminders for upcoming bills.
                  </ResponsiveTypography>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <ResponsiveTypography variant="h5" className="mb-1">
                    Multiple Payment Methods
                  </ResponsiveTypography>
                  <ResponsiveTypography variant="small" className="text-muted-foreground">
                    Support for credit cards, ACH transfers, and digital wallets for maximum flexibility.
                  </ResponsiveTypography>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card p-4 rounded-xl shadow-lg border">
            <OptimizedImage
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
              alt="Municipal Payment Dashboard showing analytics and payment management features"
              width={600}
              height={400}
              className="w-full rounded-lg shadow-md"
              quality="medium"
              loading="lazy"
            />
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default FeaturesSection;