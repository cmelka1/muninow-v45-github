
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';
import OptimizedImage from '@/components/ui/optimized-image';
import municipalBuilding from '@/assets/municipal-building.jpg';

const MunicipalitiesHero: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-primary/10 to-white">
      <ResponsiveContainer variant="hero" maxWidth="4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[250px] lg:min-h-[300px]">
          <div className="px-4 lg:px-6 max-w-lg mx-auto lg:mx-0">
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
          <div className="relative w-full h-[400px] lg:h-[500px] flex items-center justify-center px-4 lg:px-6">
            <div className="w-full h-full rounded-lg overflow-hidden shadow-xl border bg-card p-1 sm:p-2">
              <OptimizedImage
                src={municipalBuilding}
                alt="Municipal City Hall Building"
                width={800}
                height={500}
                className="w-full h-full object-cover rounded-lg"
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
