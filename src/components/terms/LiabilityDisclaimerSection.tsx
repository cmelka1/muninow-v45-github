import React from 'react';
import TermsSection from './TermsSection';

const LiabilityDisclaimerSection: React.FC = () => {
  return (
    <TermsSection title="12. Disclaimers and Warranty Limitations">
      <h3 className="text-xl font-medium mb-3">12.1 Service Provided "As Is"</h3>
      <p className="mb-4">
        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We expressly disclaim all warranties of any kind, whether express or implied, including but not limited to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Implied warranties of merchantability and fitness for a particular purpose</li>
        <li>Warranties of non-infringement or title</li>
        <li>Warranties regarding the accuracy, reliability, or completeness of the Service</li>
        <li>Warranties that the Service will be uninterrupted, timely, secure, or error-free</li>
        <li>Warranties regarding the results obtained from using the Service</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">12.2 Municipal Services Disclaimer</h3>
      <p className="mb-4">
        We do not warrant or guarantee:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>The accuracy of municipal service information provided through the Service</li>
        <li>The availability or functionality of municipal systems or services</li>
        <li>That payments will be credited immediately or in any specific timeframe</li>
        <li>That municipalities will accept or process payments as expected</li>
        <li>The resolution of disputes between users and municipalities</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">12.3 Technology and Security Disclaimers</h3>
      <p className="mb-4">
        While we implement industry-standard security measures, we cannot guarantee:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Complete security of data transmission over the internet</li>
        <li>Protection against all forms of cyber attacks or security breaches</li>
        <li>Compatibility with all devices, browsers, or operating systems</li>
        <li>Uninterrupted or error-free operation of the Service</li>
        <li>That all software vulnerabilities will be prevented or detected</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">12.4 Third-Party Service Disclaimers</h3>
      <p className="mb-4">
        We are not responsible for the performance or availability of third-party services including:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Payment processors and financial institutions</li>
        <li>Internet service providers and telecommunications networks</li>
        <li>Municipal systems and databases</li>
        <li>Device manufacturers and software providers</li>
        <li>Cloud services and hosting providers</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">12.5 Financial and Legal Advice Disclaimer</h3>
      <p className="mb-4">
        The Service does not provide:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Financial, investment, or tax advice</li>
        <li>Legal advice or interpretation of municipal regulations</li>
        <li>Professional consultation services</li>
        <li>Recommendations regarding payment strategies or timing</li>
      </ul>
      <p className="mb-4">
        You should consult with qualified professionals for financial, legal, or tax advice.
      </p>
      
      <h3 className="text-xl font-medium mb-3">12.6 Limitation of Liability</h3>
      <p className="mb-4">
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL MUNI NOW, INC., ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
      </p>
      
      <h3 className="text-xl font-medium mb-3">12.7 State Law Variations</h3>
      <p className="mb-4">
        Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential or incidental damages. In such jurisdictions, our liability shall be limited to the maximum extent permitted by law.
      </p>
    </TermsSection>
  );
};

export default LiabilityDisclaimerSection;