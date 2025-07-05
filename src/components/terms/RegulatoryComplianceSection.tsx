import React from 'react';
import TermsSection from './TermsSection';

const RegulatoryComplianceSection: React.FC = () => {
  return (
    <TermsSection title="9. Regulatory Compliance">
      <h3 className="text-xl font-medium mb-3">9.1 Financial Services Compliance</h3>
      <p className="mb-4">
        Our payment services comply with applicable financial regulations including:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Bank Secrecy Act (BSA):</strong> Anti-money laundering reporting and record-keeping</li>
        <li><strong>USA PATRIOT Act:</strong> Customer identification and verification requirements</li>
        <li><strong>Consumer Financial Protection Bureau (CFPB):</strong> Consumer protection regulations</li>
        <li><strong>Electronic Fund Transfer Act (EFTA):</strong> Electronic payment rights and protections</li>
        <li><strong>Fair Credit Reporting Act (FCRA):</strong> Consumer credit information protection</li>
        <li><strong>State Money Transmission Laws:</strong> Licensing and regulatory compliance</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">9.2 Payment Card Industry Compliance</h3>
      <p className="mb-4">We maintain compliance with payment card network rules:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Visa:</strong> Compliance with Visa Operating Regulations</li>
        <li><strong>Mastercard:</strong> Adherence to Mastercard Rules and Standards</li>
        <li><strong>American Express:</strong> Compliance with Amex merchant requirements</li>
        <li><strong>Discover:</strong> Adherence to Discover Network rules</li>
        <li><strong>PCI DSS:</strong> Payment Card Industry Data Security Standards</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">9.3 State and Local Compliance</h3>
      <p className="mb-4">Municipal payment processing involves compliance with:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>State and local government payment processing requirements</li>
        <li>Municipal finance and accounting standards</li>
        <li>Public records and transparency requirements</li>
        <li>Accessibility standards for public services</li>
        <li>Data privacy laws applicable to government services</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">9.4 Consumer Protection</h3>
      <p className="mb-4">We provide consumer protections including:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Disclosure Requirements:</strong> Clear fee and term disclosures</li>
        <li><strong>Error Resolution:</strong> Procedures for resolving payment errors</li>
        <li><strong>Dispute Rights:</strong> Rights to dispute unauthorized transactions</li>
        <li><strong>Privacy Protection:</strong> Safeguarding of personal and financial information</li>
        <li><strong>Accessibility:</strong> Equal access to payment services</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">9.5 Reporting and Record Keeping</h3>
      <p className="mb-4">We maintain comprehensive records and reporting:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Transaction records retained per regulatory requirements</li>
        <li>Customer identification and verification documentation</li>
        <li>Suspicious activity monitoring and reporting</li>
        <li>Compliance training and audit documentation</li>
        <li>Regular regulatory examination and reporting</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">9.6 International Compliance</h3>
      <p className="mb-4">Where applicable, we comply with international standards:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>FATF (Financial Action Task Force) recommendations</li>
        <li>GDPR and other international privacy regulations</li>
        <li>International payment system requirements</li>
        <li>Cross-border transaction reporting requirements</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">9.7 Regulatory Changes</h3>
      <p className="mb-4">
        We continuously monitor regulatory changes and update our practices accordingly. 
        Users will be notified of material changes that affect their rights or obligations 
        under these Terms.
      </p>
    </TermsSection>
  );
};

export default RegulatoryComplianceSection;