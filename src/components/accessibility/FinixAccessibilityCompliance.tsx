import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FinixAccessibilityCompliance: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finix Payment Integration Accessibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Our payment processing through Finix meets all accessibility requirements for financial services, ensuring 
          secure and accessible payment experiences for all users.
        </p>
        
        <h3 className="text-lg font-semibold">Finix Integration Accessibility Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>PCI DSS Compliant Forms:</strong> Secure payment forms that work with assistive technologies</li>
          <li><strong>Tokenization Accessibility:</strong> Secure card data tokenization with accessible user feedback</li>
          <li><strong>Screen Reader Support:</strong> Full compatibility with screen readers for payment form completion</li>
          <li><strong>Keyboard Navigation:</strong> Complete payment flows accessible via keyboard only</li>
          <li><strong>Error Handling:</strong> Clear, accessible error messages for payment processing issues</li>
          <li><strong>Progress Indicators:</strong> Accessible feedback during payment processing</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Financial Accessibility Standards</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Section 508 Compliance:</strong> Meets federal accessibility requirements for financial systems</li>
          <li><strong>ADA Compliance:</strong> Americans with Disabilities Act compliance for payment processing</li>
          <li><strong>WCAG 2.2 AA:</strong> Web Content Accessibility Guidelines compliance for financial forms</li>
          <li><strong>ISO 14289:</strong> PDF accessibility standards for financial documents and receipts</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Secure Accessible Payments</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Accessible Authentication:</strong> Multi-factor authentication options for users with disabilities</li>
          <li><strong>Fraud Protection:</strong> Accessible security measures that don't impede usability</li>
          <li><strong>Transaction Confirmation:</strong> Clear, accessible confirmation of payment status</li>
          <li><strong>Receipt Accessibility:</strong> Payment receipts in multiple accessible formats</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Finix Documentation Compliance</h3>
        <p>
          Our implementation follows Finix's accessibility guidelines and security requirements as outlined in their 
          documentation. This includes proper handling of sensitive payment data while maintaining full accessibility 
          for users with disabilities.
        </p>
      </CardContent>
    </Card>
  );
};

export default FinixAccessibilityCompliance;