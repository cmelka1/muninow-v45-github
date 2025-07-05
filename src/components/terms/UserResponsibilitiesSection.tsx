import React from 'react';
import TermsSection from './TermsSection';

const UserResponsibilitiesSection: React.FC = () => {
  return (
    <TermsSection title="4. User Responsibilities and Prohibited Activities">
      <p className="mb-4">
        You agree to use the Service responsibly and in compliance with all applicable laws. You are prohibited from:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Using the Service for any unlawful purpose or in violation of any local, state, national, or international law.</li>
        <li>Attempting to gain unauthorized access to any portion of the Service, other accounts, or systems.</li>
        <li>Interfering with or disrupting the Service or servers or networks connected to the Service.</li>
        <li>Transmitting any malicious code, viruses, or other harmful computer programs.</li>
        <li>Using the Service to transmit spam, chain letters, or other unsolicited communications.</li>
        <li>Impersonating any person or entity or falsely stating your affiliation with a person or entity.</li>
        <li>Collecting or harvesting personal information from other users without their consent.</li>
        <li>Using automated systems to access the Service without our express written permission.</li>
        <li>Attempting to reverse engineer, decompile, or disassemble any portion of the Service.</li>
        <li>Making false or fraudulent payment attempts or engaging in payment fraud.</li>
        <li>Using the Service to launder money or finance illegal activities.</li>
        <li>Violating any payment card network rules or regulations.</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">4.1 Account Security</h3>
      <p className="mb-4">You are responsible for:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Maintaining the confidentiality of your account credentials</li>
        <li>All activities that occur under your account</li>
        <li>Immediately notifying us of any unauthorized access or security breach</li>
        <li>Using strong, unique passwords and enabling multi-factor authentication when available</li>
        <li>Keeping your contact information and payment methods up to date</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">4.2 Payment Obligations</h3>
      <p className="mb-4">When making payments through the Service, you agree to:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Provide accurate and complete payment information</li>
        <li>Only use payment methods that you are authorized to use</li>
        <li>Pay all applicable fees and charges in a timely manner</li>
        <li>Notify us immediately of any unauthorized transactions</li>
        <li>Comply with all payment card network rules and regulations</li>
      </ul>
    </TermsSection>
  );
};

export default UserResponsibilitiesSection;