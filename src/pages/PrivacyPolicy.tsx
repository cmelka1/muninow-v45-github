import React from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { getPageMetadata } from '@/utils/seoUtils';
import PrivacyPolicySection from '@/components/privacy/PrivacyPolicySection';
import DataCollectionSection from '@/components/privacy/DataCollectionSection';
import PaymentComplianceSection from '@/components/privacy/PaymentComplianceSection';
import FinixDisclosuresSection from '@/components/privacy/FinixDisclosuresSection';
import DataUsageSection from '@/components/privacy/DataUsageSection';
import PrivacyRightsSection from '@/components/privacy/PrivacyRightsSection';
import ContactSection from '@/components/privacy/ContactSection';

const PrivacyPolicy: React.FC = () => {
  const metadata = getPageMetadata('privacy');
  
  const breadcrumbs = [
    { name: "Home", url: "https://muninow.com/" },
    { name: "Privacy Policy", url: "https://muninow.com/privacy" }
  ];

  return (
    <PageLayout
      title={metadata.title.replace(' - MuniNow', '')}
      description={metadata.description}
      keywords={metadata.keywords}
      canonical={metadata.canonical}
      breadcrumbs={breadcrumbs}
    >
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-muted-foreground mb-8">Last Updated: July 5, 2025</p>

            <PrivacyPolicySection title="1. Introduction">
              <p className="mb-4">
                Muni Now, Inc. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our municipal services platform (the "Service").
              </p>
              <p>
                Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </PrivacyPolicySection>

            <DataCollectionSection />
            
            <PaymentComplianceSection />
            
            <FinixDisclosuresSection />

            <PrivacyPolicySection title="5. Payment Industry Compliance">
              <h3 className="text-xl font-medium mb-3">5.1 PCI DSS Compliance</h3>
              <p className="mb-4">
                We maintain strict compliance with Payment Card Industry Data Security Standards (PCI DSS):
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>All payment card data is processed through PCI DSS Level 1 compliant systems</li>
                <li>We use secure tokenization to replace sensitive card data with non-sensitive tokens</li>
                <li>Payment processing environments are regularly audited and certified</li>
                <li>Access to payment data is restricted to authorized personnel only</li>
                <li>We maintain comprehensive security monitoring and incident response procedures</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">5.2 Financial Regulations Compliance</h3>
              <p className="mb-4">Our payment processing complies with applicable financial regulations including:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Bank Secrecy Act (BSA) and Anti-Money Laundering (AML) requirements</li>
                <li>USA PATRIOT Act compliance for identity verification</li>
                <li>Consumer Financial Protection Bureau (CFPB) regulations</li>
                <li>State and federal consumer protection laws</li>
                <li>Payment Card Industry regulations and standards</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">5.3 Know Your Customer (KYC) Requirements</h3>
              <p className="mb-4">
                To comply with financial regulations, we may collect additional information for identity verification:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Government-issued identification numbers</li>
                <li>Date of birth and Social Security Number (when required)</li>
                <li>Business information for commercial accounts</li>
                <li>Beneficial ownership information for business entities</li>
                <li>Source of funds documentation for large transactions</li>
              </ul>
            </PrivacyPolicySection>

            <DataUsageSection />

            <PrivacyPolicySection title="7. Data Sharing and Disclosure">
              <p className="mb-4">We may share your personal information with the following categories of recipients:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Municipal Partners:</strong> We share information with municipalities as necessary to process payments and provide services, including payment confirmations and transaction records.</li>
                <li><strong>Payment Processor (Finix):</strong> We share payment-related information with Finix to process transactions, including:
                  <ul className="list-disc pl-6 mt-2 mb-2">
                    <li>Cardholder name and billing address</li>
                    <li>Tokenized payment credentials</li>
                    <li>Transaction amounts and descriptions</li>
                    <li>Identity verification data as required for compliance</li>
                    <li>Fraud prevention and risk assessment data</li>
                  </ul>
                </li>
                <li><strong>Financial Institutions:</strong> Banks, card networks, and other financial institutions involved in payment processing and settlement.</li>
                <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf, including data analysis, email delivery, hosting, customer service, and fraud prevention services.</li>
                <li><strong>Compliance and Legal Requirements:</strong> We may disclose information if required to do so by law, regulation, legal process, or in response to valid requests by public authorities, including for anti-money laundering, tax reporting, and law enforcement purposes.</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business.</li>
                <li><strong>With Your Consent:</strong> We may share information with your consent or at your direction.</li>
              </ul>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="8. Data Retention and Deletion">
              <p className="mb-4">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Payment Data:</strong> Transaction records and payment-related data are retained for a minimum of 7 years to comply with financial regulations, tax requirements, and dispute resolution needs.</li>
                <li><strong>Payment Tokens:</strong> Securely stored with Finix until you remove the payment method or close your account.</li>
                <li><strong>Account Information:</strong> Retained for the duration of your account relationship and up to 7 years after account closure for legal and compliance purposes.</li>
                <li><strong>Fraud Prevention Data:</strong> Retained for up to 5 years to maintain effective fraud detection and prevention systems.</li>
                <li><strong>KYC/Identity Verification Data:</strong> Retained for the duration required by applicable financial regulations, typically 5-7 years after account closure.</li>
                <li><strong>Transaction Dispute Records:</strong> Retained for up to 2 years beyond the resolution of any dispute or chargeback.</li>
              </ul>
              
              <h3 className="text-xl font-medium mb-3">8.1 Secure Data Deletion</h3>
              <p className="mb-4">When data retention periods expire, we:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Securely delete personal data using industry-standard data destruction methods</li>
                <li>Ensure complete removal from all systems, including backups</li>
                <li>Coordinate with Finix for secure deletion of tokenized payment data</li>
                <li>Maintain records of data deletion activities for audit purposes</li>
              </ul>
            </PrivacyPolicySection>

            <PrivacyRightsSection />

            <PrivacyPolicySection title="10. Data Security">
              <p className="mb-4">
                We implement comprehensive technical and organizational measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Encryption:</strong> All sensitive data is encrypted both in transit using TLS 1.2+ and at rest using AES-256 encryption.</li>
                <li><strong>PCI DSS Compliance:</strong> Our payment processing infrastructure maintains PCI DSS Level 1 compliance.</li>
                <li><strong>Tokenization:</strong> Payment card data is immediately tokenized and never stored in plain text on our systems.</li>
                <li><strong>Access Controls:</strong> Multi-factor authentication, role-based access controls, and principle of least privilege.</li>
                <li><strong>Network Security:</strong> Firewalls, intrusion detection systems, and network segmentation.</li>
                <li><strong>Regular Security Assessments:</strong> Penetration testing, vulnerability assessments, and security audits.</li>
                <li><strong>Staff Training:</strong> Regular security awareness training for all personnel handling sensitive data.</li>
                <li><strong>Physical Security:</strong> Secure data centers with restricted access and environmental controls.</li>
                <li><strong>Incident Response:</strong> Comprehensive incident response and breach notification procedures.</li>
              </ul>
              <p>
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="11. Payment Disputes and Chargebacks">
              <p className="mb-4">
                In the event of payment disputes, chargebacks, or refund requests:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>We may share relevant transaction information with financial institutions, card networks, and our payment processor to resolve disputes.</li>
                <li>We retain detailed transaction records to support dispute resolution processes.</li>
                <li>Dispute-related communications and documentation may be retained for up to 2 years beyond the resolution of the dispute.</li>
                <li>You may be required to provide additional verification information to process dispute claims.</li>
              </ul>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="12. Data Breach Notification">
              <p className="mb-4">
                In the event of a personal data breach that is likely to result in a risk to your rights and freedoms:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>We will notify you and the relevant supervisory authority without undue delay and, where feasible, within 72 hours after becoming aware of the breach.</li>
                <li>For payment-related breaches, we will also notify relevant payment industry authorities and our payment processor as required.</li>
                <li>We maintain a comprehensive incident response plan specifically for payment data breaches.</li>
                <li>We will provide clear information about the nature of the breach, potential risks, and steps being taken to address the situation.</li>
              </ul>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="13. Cookies and Tracking Technologies">
              <p>
                We use cookies and similar tracking technologies to collect and use information about you. For detailed information about our use of cookies, including types of cookies, purposes, and your choices, please see our separate <a href="/cookies" className="text-primary hover:underline">Cookies Policy</a>.
              </p>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="14. Children's Privacy">
              <p>
                Our Service is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us, and we will take steps to delete such information.
              </p>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="15. International Data Transfers">
              <p className="mb-4">
                We primarily store and process your information within the United States. When we transfer your information to other countries:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable law.</li>
                <li>For payment processing, data may be transferred to and processed in countries where our payment processor, Finix, operates, subject to appropriate data protection safeguards.</li>
                <li>We use Standard Contractual Clauses, adequacy decisions, or other approved transfer mechanisms as required by applicable data protection laws.</li>
                <li>Cross-border data transfers for payment processing are conducted in compliance with payment industry regulations and standards.</li>
              </ul>
            </PrivacyPolicySection>

            <PrivacyPolicySection title="16. Changes to This Privacy Policy">
              <p className="mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. The updated version will be effective as of the date stated at the top of this Privacy Policy. We will notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Sending you a notification through the Service or to your registered email address</li>
                <li>For significant changes affecting payment processing or data sharing, providing at least 30 days' advance notice</li>
              </ul>
            </PrivacyPolicySection>

            <ContactSection />
          </div>
        </main>
      </div>
    </PageLayout>
  );
};

export default PrivacyPolicy;