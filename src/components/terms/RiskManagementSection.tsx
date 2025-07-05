import React from 'react';
import TermsSection from './TermsSection';

const RiskManagementSection: React.FC = () => {
  return (
    <TermsSection title="8. Risk Management and Fraud Prevention">
      <h3 className="text-xl font-medium mb-3">8.1 Fraud Detection and Prevention</h3>
      <p className="mb-4">
        We employ comprehensive fraud prevention measures to protect all users:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Transaction Monitoring:</strong> Real-time analysis of all payment transactions</li>
        <li><strong>Device Fingerprinting:</strong> Identification of suspicious device patterns</li>
        <li><strong>Behavioral Analytics:</strong> Detection of unusual account activity</li>
        <li><strong>IP Geolocation:</strong> Monitoring for suspicious location-based access</li>
        <li><strong>Velocity Checks:</strong> Detection of rapid or excessive transaction attempts</li>
        <li><strong>Machine Learning:</strong> Advanced algorithms to identify fraud patterns</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">8.2 Account Security Measures</h3>
      <p className="mb-4">We may implement additional security measures when risk is detected:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Multi-Factor Authentication:</strong> Required for high-risk transactions</li>
        <li><strong>Identity Verification:</strong> Additional verification may be requested</li>
        <li><strong>Transaction Limits:</strong> Temporary limits may be applied to prevent fraud</li>
        <li><strong>Account Monitoring:</strong> Enhanced monitoring for suspicious accounts</li>
        <li><strong>Payment Delays:</strong> Transactions may be delayed for additional review</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">8.3 Suspicious Activity Response</h3>
      <p className="mb-4">When suspicious activity is detected, we may:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Temporarily suspend account access or payment capabilities</li>
        <li>Request additional identity verification documents</li>
        <li>Require you to contact customer support for account restoration</li>
        <li>Report suspected criminal activity to appropriate authorities</li>
        <li>Coordinate with financial institutions and payment networks</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">8.4 User Cooperation</h3>
      <p className="mb-4">Your cooperation is essential for effective risk management:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Accurate Information:</strong> Provide truthful and current account information</li>
        <li><strong>Prompt Response:</strong> Respond quickly to security verification requests</li>
        <li><strong>Activity Monitoring:</strong> Review and report unauthorized account activity</li>
        <li><strong>Documentation:</strong> Provide requested verification documents when needed</li>
        <li><strong>Communication:</strong> Maintain current contact information for security alerts</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">8.5 Risk-Based Account Restrictions</h3>
      <p className="mb-4">
        Based on risk assessment, we may implement account restrictions including:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Transaction amount limits</li>
        <li>Payment method restrictions</li>
        <li>Enhanced verification requirements</li>
        <li>Temporary account holds</li>
        <li>Additional monitoring periods</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">8.6 Money Laundering Prevention</h3>
      <p className="mb-4">
        In compliance with anti-money laundering (AML) regulations, we:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Monitor transactions for suspicious patterns</li>
        <li>Maintain records of customer identification and transactions</li>
        <li>Report suspicious activities to appropriate authorities</li>
        <li>Implement enhanced due diligence for high-risk customers</li>
        <li>Comply with all applicable AML and BSA requirements</li>
      </ul>
    </TermsSection>
  );
};

export default RiskManagementSection;