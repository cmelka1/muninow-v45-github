import React from 'react';
import TermsSection from './TermsSection';

const DataSecuritySection: React.FC = () => {
  return (
    <TermsSection title="7. Data Security and PCI Compliance">
      <h3 className="text-xl font-medium mb-3">7.1 PCI DSS Compliance</h3>
      <p className="mb-4">
        We maintain strict compliance with Payment Card Industry Data Security Standards (PCI DSS):
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>All payment card data is processed through PCI DSS Level 1 compliant systems</li>
        <li>Sensitive payment information is immediately tokenized upon entry</li>
        <li>Payment processing environments are regularly audited and certified</li>
        <li>Access to payment data is restricted to authorized personnel only</li>
        <li>Comprehensive security monitoring and incident response procedures are maintained</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">7.2 Data Encryption and Protection</h3>
      <p className="mb-4">We implement multiple layers of security to protect your data:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Encryption in Transit:</strong> All data transmission uses TLS 1.2 or higher encryption</li>
        <li><strong>Encryption at Rest:</strong> Stored data is encrypted using AES-256 encryption standards</li>
        <li><strong>Secure Tokenization:</strong> Payment card data is replaced with secure tokens</li>
        <li><strong>Network Security:</strong> Firewalls, intrusion detection, and network segmentation</li>
        <li><strong>Access Controls:</strong> Multi-factor authentication and role-based access controls</li>
        <li><strong>Security Monitoring:</strong> 24/7 monitoring for security threats and anomalies</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">7.3 Data Breach Response</h3>
      <p className="mb-4">In the unlikely event of a data security incident:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>We will investigate and contain the incident immediately</li>
        <li>Affected users will be notified within 72 hours when feasible</li>
        <li>Relevant authorities and payment card networks will be notified as required</li>
        <li>We will provide clear information about the incident and remediation steps</li>
        <li>Additional security measures will be implemented to prevent recurrence</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">7.4 User Security Responsibilities</h3>
      <p className="mb-4">You play a critical role in maintaining security:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Strong Passwords:</strong> Use unique, complex passwords for your account</li>
        <li><strong>Account Monitoring:</strong> Regularly review your account activity and payment history</li>
        <li><strong>Secure Access:</strong> Only access your account from trusted devices and networks</li>
        <li><strong>Suspicious Activity:</strong> Report any unauthorized access or suspicious activity immediately</li>
        <li><strong>Software Updates:</strong> Keep your devices and browsers updated with security patches</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">7.5 Third-Party Security</h3>
      <p className="mb-4">Our security extends to third-party relationships:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>All service providers must meet our security standards</li>
        <li>Payment processors maintain independent PCI DSS compliance</li>
        <li>Data sharing agreements include strict security requirements</li>
        <li>Regular security assessments of third-party vendors</li>
      </ul>
    </TermsSection>
  );
};

export default DataSecuritySection;