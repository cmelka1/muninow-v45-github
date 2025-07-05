import React from 'react';
import TermsSection from './TermsSection';

const LegalProvisionsSection: React.FC = () => {
  return (
    <TermsSection title="13. Legal Provisions and Dispute Resolution">
      <h3 className="text-xl font-medium mb-3">13.1 Indemnification</h3>
      <p className="mb-4">
        You agree to defend, indemnify, and hold harmless Muni Now, Inc., its affiliates, officers, directors, employees, agents, and licensors from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney's fees) arising from:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Your use of and access to the Service</li>
        <li>Your violation of any term of these Terms</li>
        <li>Your violation of any third-party right, including any copyright, property, or privacy right</li>
        <li>Any claim that your use of the Service caused damage to a third party</li>
        <li>Your fraudulent or illegal use of payment methods or the Service</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">13.2 Governing Law</h3>
      <p className="mb-4">
        These Terms shall be interpreted and governed by the laws of the State of Massachusetts, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
      </p>
      
      <h3 className="text-xl font-medium mb-3">13.3 Dispute Resolution and Arbitration</h3>
      <p className="mb-4">
        <strong>PLEASE READ THIS SECTION CAREFULLY AS IT AFFECTS YOUR RIGHTS.</strong>
      </p>
      <p className="mb-4">
        Most disputes can be resolved without resorting to formal dispute resolution. Before filing a claim, you agree to contact us at <a href="mailto:contact@muninow.com" className="text-primary hover:underline">contact@muninow.com</a> to seek a resolution.
      </p>
      
      <h4 className="text-lg font-medium mb-2">13.3.1 Binding Arbitration</h4>
      <p className="mb-4">
        If we cannot resolve a dispute informally, any legal dispute will be resolved through binding arbitration, rather than in court, except that you may assert claims in small claims court if they qualify. The arbitration will be administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules.
      </p>
      
      <h4 className="text-lg font-medium mb-2">13.3.2 Class Action Waiver</h4>
      <p className="mb-4">
        You and Muni Now, Inc. agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.
      </p>
      
      <h4 className="text-lg font-medium mb-2">13.3.3 Exceptions to Arbitration</h4>
      <p className="mb-4">
        Notwithstanding the above, the following disputes will not be subject to arbitration:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Disputes seeking equitable relief for the alleged unlawful use of copyrights, trademarks, or other intellectual property</li>
        <li>Disputes related to, or arising from, allegations of theft, piracy, invasion of privacy, or unauthorized use</li>
        <li>Small claims court actions</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">13.4 Jurisdiction and Venue</h3>
      <p className="mb-4">
        For disputes not subject to arbitration, you agree that any legal action or proceeding shall be brought exclusively in the federal or state courts located in Boston, Massachusetts, and you consent to the jurisdiction of such courts.
      </p>
      
      <h3 className="text-xl font-medium mb-3">13.5 Statute of Limitations</h3>
      <p className="mb-4">
        Regardless of any statute or law to the contrary, any claim or cause of action arising out of or related to use of the Service or these Terms must be filed within one (1) year after such claim or cause of action arose or be forever barred.
      </p>
      
      <h3 className="text-xl font-medium mb-3">13.6 Severability</h3>
      <p className="mb-4">
        If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions will continue to be valid and enforceable. Any invalid or unenforceable portions will be interpreted to effect and intent of the original provision.
      </p>
      
      <h3 className="text-xl font-medium mb-3">13.7 Assignment</h3>
      <p className="mb-4">
        We may assign our rights and obligations under these Terms without your consent. You may not assign your rights under these Terms without our prior written consent.
      </p>
      
      <h3 className="text-xl font-medium mb-3">13.8 Entire Agreement</h3>
      <p className="mb-4">
        These Terms, together with our Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and us regarding the use of the Service.
      </p>
    </TermsSection>
  );
};

export default LegalProvisionsSection;