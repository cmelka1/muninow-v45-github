import React from 'react';
import TermsSection from './TermsSection';

const EnhancedLiabilitySection: React.FC = () => {
  return (
    <TermsSection title="10. Payment-Specific Liability and Limitations">
      <h3 className="text-xl font-medium mb-3">10.1 Payment Processing Liability</h3>
      <p className="mb-4">
        Our liability related to payment processing is subject to the following limitations:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Processing Errors:</strong> Our liability is limited to the amount of the erroneous transaction plus applicable fees</li>
        <li><strong>System Downtime:</strong> We are not liable for damages due to temporary service interruptions</li>
        <li><strong>Third-Party Failures:</strong> We are not liable for failures of banks, payment networks, or other third parties</li>
        <li><strong>Unauthorized Access:</strong> Liability is limited when unauthorized access results from user negligence</li>
        <li><strong>Municipal Actions:</strong> We are not liable for actions taken by municipalities regarding payments</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">10.2 Maximum Liability Limits</h3>
      <p className="mb-4">In no event shall our total liability exceed:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>For individual transactions: The amount of the transaction plus applicable fees</li>
        <li>For monthly activity: The total fees paid by you in the preceding 12 months</li>
        <li>For account-related issues: $500 per incident or $2,500 per year, whichever is less</li>
        <li>For data security incidents: Actual direct damages not exceeding $10,000</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">10.3 User Liability and Responsibility</h3>
      <p className="mb-4">You are responsible for:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Authorized Transactions:</strong> All payments made using your account or payment methods</li>
        <li><strong>Account Security:</strong> Maintaining the security of your login credentials</li>
        <li><strong>Accurate Information:</strong> Providing correct payment and billing information</li>
        <li><strong>Timely Reporting:</strong> Reporting unauthorized transactions within 60 days</li>
        <li><strong>Fee Obligations:</strong> All processing fees and charges associated with your transactions</li>
        <li><strong>Municipal Obligations:</strong> The underlying municipal bills and obligations being paid</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">10.4 Force Majeure and External Factors</h3>
      <p className="mb-4">We are not liable for delays or failures due to:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Natural disasters, acts of God, or extreme weather events</li>
        <li>Government actions, regulations, or sanctions</li>
        <li>Banking system failures or payment network outages</li>
        <li>Internet or telecommunications service disruptions</li>
        <li>Cyber attacks, hacking, or other security incidents beyond our control</li>
        <li>Labor disputes, strikes, or work stoppages</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">10.5 Consequential Damages Exclusion</h3>
      <p className="mb-4">
        We are not liable for indirect, incidental, special, or consequential damages including:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Lost profits or business opportunities</li>
        <li>Late fees or penalties imposed by municipalities</li>
        <li>Service interruptions by municipalities</li>
        <li>Credit score impacts or reporting issues</li>
        <li>Emotional distress or inconvenience</li>
        <li>Punitive or exemplary damages</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">10.6 Financial Institution Protections</h3>
      <p className="mb-4">
        Your financial institution may provide additional protections:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Zero liability policies for unauthorized credit card transactions</li>
        <li>Regulation E protections for electronic fund transfers</li>
        <li>Chargeback rights for disputed transactions</li>
        <li>Fraud monitoring and alerts</li>
      </ul>
      <p className="mb-4">
        These protections are provided by your financial institution and are separate from our services.
      </p>
      
      <h3 className="text-xl font-medium mb-3">10.7 Limitation Period</h3>
      <p className="mb-4">
        Any claims against us must be brought within one (1) year after the cause of action arises, 
        except as otherwise required by applicable law.
      </p>
    </TermsSection>
  );
};

export default EnhancedLiabilitySection;