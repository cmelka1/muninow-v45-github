
import React, { useEffect } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import LazyLoadingWrapper from '@/components/shared/LazyLoadingWrapper';
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation';
import { getPageMetadata } from '@/utils/seoUtils';

// Lazy load heavy components
const HeroSection = React.lazy(() => import('@/components/home/HeroSection'));
const HowItWorksSection = React.lazy(() => import('@/components/home/HowItWorksSection'));
const FeaturesSection = React.lazy(() => import('@/components/home/FeaturesSection'));
const CTASection = React.lazy(() => import('@/components/home/CTASection'));

const Index = () => {
  const { isMobile } = useResponsiveNavigation();
  const metadata = getPageMetadata('home');

  // Initialize performance optimizations
  useEffect(() => {
    // Preload critical route chunks
    import('@/pages/SimpleAuth');
    import('@/pages/Signup');
  }, []);

  return (
    <PageLayout
      title={metadata.title}
      description={metadata.description}
      keywords={metadata.keywords}
      canonical={metadata.canonical}
    >
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
    </PageLayout>
  );
};

export default Index;
