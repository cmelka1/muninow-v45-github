import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AccessibilityIntroduction: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Our Commitment to Accessibility</CardTitle>
        <CardDescription>MuniNow is committed to ensuring digital accessibility for people with disabilities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          We are continually improving the user experience for everyone, and applying the relevant accessibility standards 
          to ensure we provide equal access to all of our users. This commitment extends to all aspects of our platform, 
          including payment processing, personal data management, and municipal service interactions.
        </p>
        <p>
          Our accessibility efforts are guided by the principles of perceivable, operable, understandable, and robust 
          design, ensuring that our municipal payment platform serves all community members effectively and securely.
        </p>
        <p>
          We recognize that accessibility is not just a legal requirement but a fundamental aspect of inclusive design 
          that enables equal participation in municipal services and civic engagement.
        </p>
      </CardContent>
    </Card>
  );
};

export default AccessibilityIntroduction;