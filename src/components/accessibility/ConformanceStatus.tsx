import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ConformanceStatus: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conformance Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve 
          accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.
        </p>
        <p>
          <strong>MuniNow is partially conformant with WCAG 2.2 level AA.</strong> Partially conformant means that some 
          parts of the content do not fully conform to the accessibility standard.
        </p>
        
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
          <h3 className="text-lg font-semibold mb-2">Current Compliance Status</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>WCAG 2.2 AA:</strong> Partially conformant</li>
            <li><strong>Section 508:</strong> Compliant for federal accessibility requirements</li>
            <li><strong>ADA Title II:</strong> Compliant for public entity digital accessibility</li>
            <li><strong>EN 301 549:</strong> European accessibility standard compliance</li>
          </ul>
        </div>
        
        <h3 className="text-xl font-semibold mt-4">Ongoing Improvements</h3>
        <p>
          We are actively working to achieve full WCAG 2.2 AA conformance across all platform features, with particular 
          attention to payment processing workflows, personal data entry forms, and municipal service interactions.
        </p>
      </CardContent>
    </Card>
  );
};

export default ConformanceStatus;