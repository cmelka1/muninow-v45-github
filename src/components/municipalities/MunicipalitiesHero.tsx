
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';
import OptimizedImage from '@/components/ui/optimized-image';

const MunicipalitiesHero: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-primary/10 to-white">
      <ResponsiveContainer variant="hero" maxWidth="6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[500px] lg:min-h-[600px]">
          <div>
            <ResponsiveTypography variant="h1" className="mb-6">
              Streamline Municipal Bill Collection
            </ResponsiveTypography>
            <ResponsiveTypography variant="body" className="text-muted-foreground mb-8 text-xl">
              Our comprehensive platform helps municipalities modernize payment processes, reduce administrative overhead, and improve resident and business satisfaction.
            </ResponsiveTypography>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" aria-label="Schedule a demo with MuniNow">
                <Button size="lg" className="px-8">
                  Schedule a Demo
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-full h-full rounded-lg overflow-hidden shadow-xl border bg-card p-1 sm:p-2">
              <OptimizedImage
                src="https://images.unsplash.com/photo-1449157291145-7efd050a4d0e"
                alt="Municipal City Hall Building"
                width={600}
                height={400}
                className="w-full h-full object-cover rounded-lg transition-all duration-300 hover:scale-105"
                priority={true}
                quality="high"
                loading="eager"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
              />
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default MunicipalitiesHero;
