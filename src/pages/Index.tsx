
import React, { useEffect } from 'react';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';
import LazyLoadingWrapper from '@/components/shared/LazyLoadingWrapper';
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation';

// Lazy load heavy components
const HeroSection = React.lazy(() => import('@/components/home/HeroSection'));
const HowItWorksSection = React.lazy(() => import('@/components/home/HowItWorksSection'));
const FeaturesSection = React.lazy(() => import('@/components/home/FeaturesSection'));
const CTASection = React.lazy(() => import('@/components/home/CTASection'));

const Index = () => {
  const { isMobile } = useResponsiveNavigation();

  // Initialize performance optimizations
  useEffect(() => {
    // Preload critical route chunks
    import('@/pages/Auth');
    import('@/pages/Signup');
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <PreloginHeader />

      <main>
        {/* Hero Section - Critical above-the-fold content */}
        <LazyLoadingWrapper fallback={<div className="h-96 gradient-bg animate-pulse" />}>
          <HeroSection isMobile={isMobile} />
        </LazyLoadingWrapper>

        {/* Lazy loaded sections for better performance */}
        <LazyLoadingWrapper fallback={<div className="h-96 bg-background animate-pulse" />}>
          <HowItWorksSection isMobile={isMobile} />
        </LazyLoadingWrapper>

        <LazyLoadingWrapper fallback={<div className="h-96 bg-muted/30 animate-pulse" />}>
          <FeaturesSection isMobile={isMobile} />
        </LazyLoadingWrapper>

        <LazyLoadingWrapper fallback={<div className="h-64 bg-primary/90 animate-pulse" />}>
          <CTASection />
        </LazyLoadingWrapper>
      </main>

      <PreloginFooter />
    </div>
  );
};

export default Index;
