import React from 'react';
import TermsSection from './TermsSection';

const GeneralTermsSection: React.FC = () => {
  return (
    <TermsSection title="11. Intellectual Property and Data Privacy">
      <h3 className="text-xl font-medium mb-3">11.1 Intellectual Property Rights</h3>
      <p className="mb-4">
        The Service and its original content, features, and functionality are and will remain the exclusive property of Muni Now, Inc. and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used without our written permission.
      </p>
      
      <h3 className="text-xl font-medium mb-3">11.2 User Content and Data</h3>
      <p className="mb-4">You retain ownership of any content or data you provide through the Service. By using the Service, you grant us a limited, non-exclusive license to:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Process and store your data as necessary to provide the Service</li>
        <li>Share your payment information with municipalities and payment processors</li>
        <li>Use aggregated, anonymized data for service improvement and analytics</li>
        <li>Comply with legal obligations and regulatory requirements</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">11.3 Privacy Policy</h3>
      <p className="mb-4">
        Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use the Service. By using the Service, you agree to the collection and use of information in accordance with our Privacy Policy, available at <a href="/privacy" className="text-primary hover:underline">/privacy</a>.
      </p>
      
      <h3 className="text-xl font-medium mb-3">11.4 Third-Party Links and Services</h3>
      <p className="mb-4">
        The Service may contain links to third-party websites or services that are not owned or controlled by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services.
      </p>
      
      <h3 className="text-xl font-medium mb-3">11.5 Service Availability</h3>
      <p className="mb-4">
        We strive to maintain high service availability but cannot guarantee uninterrupted access. The Service may be temporarily unavailable due to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Scheduled maintenance and system updates</li>
        <li>Emergency repairs or security measures</li>
        <li>Third-party service dependencies</li>
        <li>Network or infrastructure issues</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">11.6 Feedback and Suggestions</h3>
      <p className="mb-4">
        We welcome your feedback and suggestions about the Service. Any feedback you provide may be used by us without restriction or compensation to you.
      </p>
    </TermsSection>
  );
};

export default GeneralTermsSection;