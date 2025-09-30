import React from 'react';
import TermsSection from './TermsSection';

const CommunicationConsentSection: React.FC = () => {
  return (
    <TermsSection title="5. Communication Consent and SMS Terms">
      <h3 className="text-xl font-medium mb-3">5.1 SMS and Text Messaging Consent</h3>
      <p className="mb-4">
        By providing your mobile phone number and using the Service, you expressly consent to receive SMS text messages, including:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Account verification codes and security notifications</li>
        <li>Payment confirmations and receipts</li>
        <li>Service due date reminders and payment alerts</li>
        <li>Service updates and maintenance notifications</li>
        <li>Account security alerts and fraud prevention messages</li>
        <li>Customer service communications related to your account</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">5.2 Message Frequency and Charges</h3>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Message Frequency:</strong> Message frequency varies based on your account activity and preferences. You may receive up to 10 messages per month.</li>
        <li><strong>Data and Message Rates:</strong> Standard message and data rates may apply as determined by your mobile carrier. You are responsible for all charges.</li>
        <li><strong>Carrier Compatibility:</strong> SMS services are available for most major U.S. carriers. Not all features may be available on all carriers.</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">5.3 Opt-Out and Preferences</h3>
      <p className="mb-4">You can control your communication preferences at any time:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>SMS Opt-Out:</strong> Reply STOP to any SMS message to opt out of all non-essential messages</li>
        <li><strong>Help:</strong> Reply HELP to any SMS message for assistance</li>
        <li><strong>Account Settings:</strong> Modify your communication preferences in your account settings</li>
        <li><strong>Customer Support:</strong> Contact us at <a href="mailto:contact@muninow.com" className="text-primary hover:underline">contact@muninow.com</a> for assistance</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">5.4 Email Communications</h3>
      <p className="mb-4">By creating an account, you consent to receive emails including:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Account-related notifications and confirmations</li>
        <li>Payment receipts and transaction summaries</li>
        <li>Service updates and security notifications</li>
        <li>Legal notices and policy updates</li>
      </ul>
      <p className="mb-4">
        You may unsubscribe from non-essential emails by following the unsubscribe link in each email or by updating your account preferences.
      </p>
      
      <h3 className="text-xl font-medium mb-3">5.5 Phone Communications</h3>
      <p className="mb-4">
        By providing your phone number, you consent to receive phone calls from us or our service providers for:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Account verification and customer service</li>
        <li>Fraud prevention and security purposes</li>
        <li>Payment-related issues and disputes</li>
        <li>Technical support and troubleshooting</li>
      </ul>
      <p>
        You may request to be placed on our do-not-call list by contacting customer service, though this may limit our ability to provide certain services.
      </p>
    </TermsSection>
  );
};

export default CommunicationConsentSection;