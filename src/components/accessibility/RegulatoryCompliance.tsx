import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RegulatoryCompliance: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regulatory Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          MuniNow meets or exceeds accessibility requirements established by federal, state, and international regulations:
        </p>
        
        <h3 className="text-lg font-semibold">Federal Compliance</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Section 508 (2018):</strong> Federal accessibility standards for electronic accessibility</li>
          <li><strong>ADA Title II:</strong> Americans with Disabilities Act requirements for public entities</li>
          <li><strong>ADA Title III:</strong> Public accommodation accessibility requirements</li>
          <li><strong>Rehabilitation Act:</strong> Section 504 and 508 compliance</li>
          <li><strong>21st Century Communications Act:</strong> Video and telecommunications accessibility</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">International Standards</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>WCAG 2.2 Level AA:</strong> Web Content Accessibility Guidelines compliance</li>
          <li><strong>EN 301 549:</strong> European accessibility standard for ICT procurement</li>
          <li><strong>ISO 14289-1:</strong> PDF accessibility standard</li>
          <li><strong>ISO/IEC 40500:</strong> International accessibility standard (WCAG 2.0)</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">State and Local Requirements</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>California Unruh Act:</strong> California accessibility requirements</li>
          <li><strong>New York WCAG 2.0 AA:</strong> New York State accessibility standards</li>
          <li><strong>Texas HB 2859:</strong> Texas government website accessibility</li>
          <li><strong>Municipal Requirements:</strong> Local government accessibility mandates</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Financial Services Compliance</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>PCI DSS:</strong> Payment Card Industry accessibility in secure environments</li>
          <li><strong>Dodd-Frank Act:</strong> Financial accessibility requirements</li>
          <li><strong>Consumer Financial Protection:</strong> CFPB accessibility guidelines</li>
          <li><strong>Banking Accessibility:</strong> Federal banking accessibility standards</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Assessment and Monitoring</h3>
        <p>
          Our accessibility compliance is maintained through:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Regular Audits:</strong> Quarterly accessibility audits by certified professionals</li>
          <li><strong>Automated Testing:</strong> Continuous automated accessibility testing</li>
          <li><strong>User Testing:</strong> Regular testing with users who have disabilities</li>
          <li><strong>Third-Party Validation:</strong> Independent accessibility assessments</li>
          <li><strong>Compliance Monitoring:</strong> Ongoing monitoring of regulatory changes</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default RegulatoryCompliance;