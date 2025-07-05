import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PersonalDataAccessibility: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Data & Privacy Accessibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          We ensure that all personal data collection, management, and privacy controls are fully accessible to users 
          with disabilities, maintaining both security and usability.
        </p>
        
        <h3 className="text-lg font-semibold">Accessible Data Management</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Profile Management:</strong> Accessible forms for updating personal information</li>
          <li><strong>Privacy Controls:</strong> Clear, accessible interfaces for managing data preferences</li>
          <li><strong>Consent Management:</strong> Understandable consent forms with clear language</li>
          <li><strong>Data Export:</strong> Accessible methods for downloading personal data</li>
          <li><strong>Account Security:</strong> Accessible two-factor authentication options</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Accessible Communication</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Plain Language:</strong> Privacy notices and data handling explanations in clear, simple language</li>
          <li><strong>Multiple Formats:</strong> Important information available in various accessible formats</li>
          <li><strong>Visual Indicators:</strong> Clear visual and textual indicators for required vs. optional information</li>
          <li><strong>Progressive Disclosure:</strong> Complex information broken into manageable, accessible chunks</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Compliance Integration</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>GDPR Accessibility:</strong> Data subject rights accessible to all users</li>
          <li><strong>CCPA Compliance:</strong> California privacy rights accessible through our platform</li>
          <li><strong>Municipal Records:</strong> Public records requests accessible to citizens with disabilities</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default PersonalDataAccessibility;