import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentAccessibility: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Processing Accessibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Our payment system is designed with accessibility as a core requirement, ensuring all users can securely 
          complete municipal bill payments regardless of their abilities or assistive technology needs.
        </p>
        
        <h3 className="text-lg font-semibold">Accessible Payment Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Screen Reader Compatibility:</strong> All payment forms work with NVDA, JAWS, VoiceOver, and TalkBack</li>
          <li><strong>Keyboard Navigation:</strong> Complete payment workflows accessible via keyboard alone</li>
          <li><strong>High Contrast Support:</strong> Payment interfaces maintain clarity in high contrast modes</li>
          <li><strong>Large Text Support:</strong> Payment forms scale properly up to 200% zoom without horizontal scrolling</li>
          <li><strong>Error Identification:</strong> Clear, descriptive error messages for payment validation issues</li>
          <li><strong>Timeout Extensions:</strong> Extended session timeouts with clear warnings for payment processes</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Secure Data Entry</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Accessible Labels:</strong> All payment fields have clear, descriptive labels</li>
          <li><strong>Input Assistance:</strong> Format guidance and auto-completion where appropriate</li>
          <li><strong>Error Prevention:</strong> Input validation with clear correction guidance</li>
          <li><strong>Confirmation Steps:</strong> Clear review and confirmation processes before payment submission</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Payment Receipt Accessibility</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Structured Information:</strong> Payment confirmations use proper heading hierarchy</li>
          <li><strong>Alternative Formats:</strong> Receipts available in multiple accessible formats</li>
          <li><strong>Print Accessibility:</strong> Receipt layouts optimized for accessible printing</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default PaymentAccessibility;