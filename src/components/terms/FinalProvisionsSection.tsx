import React from 'react';
import TermsSection from './TermsSection';

const FinalProvisionsSection: React.FC = () => {
  return (
    <TermsSection title="14. Final Provisions">
      <h3 className="text-xl font-medium mb-3">14.1 Changes to Terms</h3>
      <p className="mb-4">
        We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. Material changes include:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Changes to payment processing terms or fees</li>
        <li>Modifications to liability limitations or user responsibilities</li>
        <li>Updates to dispute resolution procedures</li>
        <li>Changes affecting your privacy rights or data usage</li>
        <li>Modifications to account termination or suspension policies</li>
      </ul>
      <p className="mb-4">
        We will notify you of material changes through:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Email notification to your registered email address</li>
        <li>Prominent notice within the Service</li>
        <li>Push notifications through the mobile application (if applicable)</li>
        <li>Posted notice on our website homepage</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">14.2 Acceptance of Changes</h3>
      <p className="mb-4">
        Your continued use of the Service after any such changes constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you must discontinue your use of the Service.
      </p>
      
      <h3 className="text-xl font-medium mb-3">14.3 Account Termination</h3>
      <p className="mb-4">
        You may terminate your account at any time by:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Contacting customer support at <a href="mailto:contact@muninow.com" className="text-primary hover:underline">contact@muninow.com</a></li>
        <li>Using the account closure feature in your account settings</li>
        <li>Following the account termination procedures provided in the Service</li>
      </ul>
      
      <p className="mb-4">
        We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including but not limited to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Breach of these Terms</li>
        <li>Suspected fraudulent or illegal activity</li>
        <li>Risk management concerns</li>
        <li>Regulatory or compliance requirements</li>
        <li>Extended periods of inactivity</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">14.4 Effect of Termination</h3>
      <p className="mb-4">
        Upon termination of your account:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Your right to access and use the Service will cease immediately</li>
        <li>All pending transactions will be completed or cancelled as appropriate</li>
        <li>Stored payment methods will be securely deleted</li>
        <li>Personal data will be retained or deleted according to our Privacy Policy</li>
        <li>You remain liable for any outstanding fees or obligations</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">14.5 Survival</h3>
      <p className="mb-4">
        The following provisions will survive termination of these Terms:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Liability limitations and disclaimers</li>
        <li>Indemnification obligations</li>
        <li>Dispute resolution and arbitration clauses</li>
        <li>Intellectual property rights</li>
        <li>Payment obligations and processing terms</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">14.6 Contact Information</h3>
      <p className="mb-4">
        If you have any questions about these Terms, please contact us:
      </p>
      <div className="mb-4">
        <p className="mb-1"><strong>Muni Now, Inc.</strong></p>
        <p className="mb-1">123 Tech Plaza, Suite 400</p>
        <p className="mb-1">Boston, MA 02110</p>
        <p className="mb-1">Email: <a href="mailto:contact@muninow.com" className="text-primary hover:underline">contact@muninow.com</a></p>
        <p className="mb-1">Phone: 1-800-MUNINOW</p>
      </div>
      
      <h3 className="text-xl font-medium mb-3">14.7 Electronic Communications</h3>
      <p className="mb-4">
        By using the Service, you consent to receive electronic communications from us. These communications may include notices about your account, changes to the Service, and other Service-related information. You agree that these electronic communications satisfy any legal requirement that communications be in writing.
      </p>
      
      <h3 className="text-xl font-medium mb-3">14.8 Force Majeure</h3>
      <p className="mb-4">
        We will not be liable for any failure or delay in performance under these Terms which is due to fire, casualty, flood, earthquake, other acts of God, strikes, labor disputes, wars, government action, or other causes that are beyond our reasonable control.
      </p>
      
      <h3 className="text-xl font-medium mb-3">14.9 Language</h3>
      <p className="mb-4">
        These Terms are written in English. Any translations are provided for convenience only and may not accurately reflect the original English version. In case of any discrepancy, the English version shall prevail.
      </p>
      
      <p className="mt-8 text-sm text-muted-foreground">
        <strong>Effective Date:</strong> December 25, 2024<br />
        <strong>Last Updated:</strong> December 25, 2024
      </p>
    </TermsSection>
  );
};

export default FinalProvisionsSection;