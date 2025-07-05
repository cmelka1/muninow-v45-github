import React from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { getPageMetadata } from '@/utils/seoUtils';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';
import AccessibilityIntroduction from '@/components/accessibility/AccessibilityIntroduction';
import ConformanceStatus from '@/components/accessibility/ConformanceStatus';
import PaymentAccessibility from '@/components/accessibility/PaymentAccessibility';
import PersonalDataAccessibility from '@/components/accessibility/PersonalDataAccessibility';
import FinixAccessibilityCompliance from '@/components/accessibility/FinixAccessibilityCompliance';
import TechnicalSpecifications from '@/components/accessibility/TechnicalSpecifications';
import AssistiveTechnologies from '@/components/accessibility/AssistiveTechnologies';
import AccessibilityFeatures from '@/components/accessibility/AccessibilityFeatures';
import RegulatoryCompliance from '@/components/accessibility/RegulatoryCompliance';
import ContactAndFeedback from '@/components/accessibility/ContactAndFeedback';

const Accessibility: React.FC = () => {
  const metadata = getPageMetadata('accessibility');
  
  return (
    <PageLayout
      title={metadata.title}
      description={metadata.description}
      keywords={metadata.keywords}
      canonical={metadata.canonical}
    >
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink aria-current="page">Accessibility</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <h1 className="text-4xl font-bold mb-8 text-foreground">Accessibility Statement</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-muted-foreground mb-8 text-lg">Effective Date: April 29, 2025</p>
          
          <div className="space-y-8">
            <AccessibilityIntroduction />
            <ConformanceStatus />
            <PaymentAccessibility />
            <PersonalDataAccessibility />
            <FinixAccessibilityCompliance />
            <TechnicalSpecifications />
            <AssistiveTechnologies />
            <AccessibilityFeatures />
            <RegulatoryCompliance />
            <ContactAndFeedback />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Accessibility;