import React from 'react';
import TermsSection from './TermsSection';

const PaymentTermsSection: React.FC = () => {
  return (
    <TermsSection title="6. Payment Processing Terms">
      <h3 className="text-xl font-medium mb-3">6.1 Payment Processor</h3>
      <p className="mb-4">
        Payment processing services are provided by Finix Payments, Inc. By using our payment services, you also agree to Finix's Terms of Service and Privacy Policy, available at <a href="https://finix.com" className="text-primary hover:underline">https://finix.com</a>.
      </p>
      
      <h3 className="text-xl font-medium mb-3">6.2 Authorized Payments</h3>
      <p className="mb-4">By initiating a payment through the Service, you represent and warrant that:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>You are authorized to use the selected payment method</li>
        <li>All payment information provided is accurate and current</li>
        <li>You have sufficient funds or credit available for the transaction</li>
        <li>The payment is for a legitimate municipal obligation</li>
        <li>You will not dispute authorized transactions</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">6.3 Payment Processing Fees</h3>
      <p className="mb-4">Payment processing fees may apply and will be clearly disclosed before you complete any transaction:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Credit Card Payments:</strong> Processing fees typically range from 2.5% to 3.5% of the transaction amount</li>
        <li><strong>ACH/Bank Transfer:</strong> Fixed fees typically range from $0.50 to $1.50 per transaction</li>
        <li><strong>Fee Disclosure:</strong> All applicable fees will be displayed before you authorize any payment</li>
        <li><strong>Municipal Variation:</strong> Fees may vary by municipality and payment type</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">6.4 Payment Processing Timeline</h3>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Credit/Debit Cards:</strong> Typically processed within 1-2 business days</li>
        <li><strong>ACH/Bank Transfers:</strong> Typically processed within 3-5 business days</li>
        <li><strong>Processing Delays:</strong> May occur due to weekends, holidays, or banking system maintenance</li>
        <li><strong>Failed Payments:</strong> You will be notified immediately of any payment failures</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">6.5 Refunds and Chargebacks</h3>
      <p className="mb-4">Payment disputes must be handled according to the following procedures:</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Refund Requests:</strong> Must be submitted to the relevant municipality directly</li>
        <li><strong>Processing Refunds:</strong> We will facilitate refunds as authorized by the municipality</li>
        <li><strong>Chargeback Protection:</strong> Unauthorized chargebacks may result in account suspension</li>
        <li><strong>Dispute Resolution:</strong> We will work with you and the municipality to resolve legitimate disputes</li>
        <li><strong>Fee Refunds:</strong> Processing fees may be refunded only if the original payment is determined to be erroneous</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">6.6 Failed Payments and NSF</h3>
      <p className="mb-4">In the event of failed payments:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>You may be charged additional fees by your financial institution</li>
        <li>The municipality may assess late fees or penalties</li>
        <li>Repeated failed payments may result in account restrictions</li>
        <li>You remain responsible for the underlying municipal obligation</li>
      </ul>
      
      <h3 className="text-xl font-medium mb-3">6.7 Payment Method Storage</h3>
      <p className="mb-4">When you save payment methods:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Payment information is securely tokenized and stored by Finix</li>
        <li>We never store actual card numbers or sensitive payment data</li>
        <li>You can remove saved payment methods at any time through your account</li>
        <li>Saved payment methods may be used for future authorized transactions</li>
      </ul>
    </TermsSection>
  );
};

export default PaymentTermsSection;