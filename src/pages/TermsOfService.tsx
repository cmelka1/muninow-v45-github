import React from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { getPageMetadata } from '@/utils/seoUtils';
import TermsSection from '@/components/terms/TermsSection';
import PaymentTermsSection from '@/components/terms/PaymentTermsSection';
import DataSecuritySection from '@/components/terms/DataSecuritySection';
import RiskManagementSection from '@/components/terms/RiskManagementSection';
import RegulatoryComplianceSection from '@/components/terms/RegulatoryComplianceSection';
import EnhancedLiabilitySection from '@/components/terms/EnhancedLiabilitySection';
import UserResponsibilitiesSection from '@/components/terms/UserResponsibilitiesSection';
import CommunicationConsentSection from '@/components/terms/CommunicationConsentSection';
import GeneralTermsSection from '@/components/terms/GeneralTermsSection';
import LiabilityDisclaimerSection from '@/components/terms/LiabilityDisclaimerSection';
import LegalProvisionsSection from '@/components/terms/LegalProvisionsSection';
import FinalProvisionsSection from '@/components/terms/FinalProvisionsSection';

const TermsOfService: React.FC = () => {
  const metadata = getPageMetadata('terms');

  return (
    <PageLayout
      title={metadata.title}
      description={metadata.description}
      keywords={metadata.keywords}
      canonical={metadata.canonical}
    >
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Terms of Service</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-muted-foreground mb-8">Last Updated: July 5, 2025</p>

          <TermsSection title="1. Acceptance of Terms">
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Muni Now, Inc. ("Muni Now, Inc.," "we," "our," or "us") regarding your use of the MuniNow platform and services (collectively, the "Service").
            </p>
            <p>
              By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to all of these Terms, do not use our Service.
            </p>
          </TermsSection>

          <TermsSection title="2. Description of Service">
            <p>
              MuniNow provides a platform that facilitates municipal service management and payments. The Service enables:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Residents to access and pay for municipal services electronically.</li>
              <li>Municipalities to manage payments, reconcile accounts, and administer service systems.</li>
              <li>Integration with municipal information technology systems for data exchange and processing.</li>
              <li>Payment processing and transaction management through secure channels.</li>
            </ul>
          </TermsSection>

          <TermsSection title="3. User Accounts and Registration">
            <p>
              To access certain features of the Service, you must register for an account. When you register, you agree to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate, current, and complete information.</li>
              <li>Maintain and promptly update your account information.</li>
              <li>Maintain the security of your account credentials.</li>
              <li>Accept responsibility for all activities that occur under your account.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate your account if any information provided is inaccurate, outdated, or incomplete, or if we believe you have violated these Terms.
            </p>
          </TermsSection>

          <UserResponsibilitiesSection />
          <CommunicationConsentSection />
          <PaymentTermsSection />
          <DataSecuritySection />
          <RiskManagementSection />
          <RegulatoryComplianceSection />
          <EnhancedLiabilitySection />
          <GeneralTermsSection />
          <LiabilityDisclaimerSection />
          <LegalProvisionsSection />
          <FinalProvisionsSection />
        </div>
      </div>
    </PageLayout>
  );
};

export default TermsOfService;