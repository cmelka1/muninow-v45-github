import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AccessibilityFeatures: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessibility Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          MuniNow includes comprehensive accessibility features designed to ensure equal access to municipal services:
        </p>
        
        <h3 className="text-lg font-semibold">Navigation Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Skip Links:</strong> Skip to main content, navigation, and footer</li>
          <li><strong>Breadcrumb Navigation:</strong> Clear path indicators for complex workflows</li>
          <li><strong>Consistent Navigation:</strong> Predictable navigation patterns throughout the site</li>
          <li><strong>Focus Indicators:</strong> Clear visual focus indicators for keyboard navigation</li>
          <li><strong>Logical Tab Order:</strong> Intuitive keyboard navigation flow</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Content Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Heading Structure:</strong> Proper hierarchical heading organization</li>
          <li><strong>Alternative Text:</strong> Descriptive alt text for all informative images</li>
          <li><strong>Link Context:</strong> Clear, descriptive link text and purposes</li>
          <li><strong>Form Labels:</strong> Clear, associated labels for all form controls</li>
          <li><strong>Error Messages:</strong> Clear identification and description of input errors</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Interactive Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Accessible Buttons:</strong> Clear button labels and states</li>
          <li><strong>Modal Dialogs:</strong> Proper focus management and escape mechanisms</li>
          <li><strong>Form Validation:</strong> Real-time, accessible feedback for form inputs</li>
          <li><strong>Progress Indicators:</strong> Clear indication of multi-step process progress</li>
          <li><strong>Timeout Management:</strong> Warnings and extensions for time-sensitive operations</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Mobile Accessibility</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Touch Targets:</strong> Minimum 44px touch target sizes</li>
          <li><strong>Gesture Alternatives:</strong> Alternative methods for complex gestures</li>
          <li><strong>Orientation Support:</strong> Functional in both portrait and landscape modes</li>
          <li><strong>Zoom Support:</strong> Content reflows properly when zoomed to 500%</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default AccessibilityFeatures;