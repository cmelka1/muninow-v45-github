import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TechnicalSpecifications: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical Specifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Accessibility of MuniNow relies on the following technologies to work with the particular combination of 
          web browser and any assistive technologies or plugins installed on your computer:
        </p>
        
        <h3 className="text-lg font-semibold">Core Technologies</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>HTML5:</strong> Semantic markup with proper ARIA landmarks and roles</li>
          <li><strong>CSS3:</strong> Responsive design with accessibility-first styling</li>
          <li><strong>JavaScript (ES2020+):</strong> Progressive enhancement with accessibility APIs</li>
          <li><strong>WAI-ARIA 1.2:</strong> Advanced accessibility attributes and live regions</li>
          <li><strong>React 18:</strong> Accessible component architecture with proper focus management</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Accessibility-Specific Technologies</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>ARIA Live Regions:</strong> Dynamic content updates for screen readers</li>
          <li><strong>Focus Management:</strong> Programmatic focus control for single-page application navigation</li>
          <li><strong>Semantic Landmarks:</strong> Proper page structure with navigation landmarks</li>
          <li><strong>Color Independence:</strong> Information conveyed without relying solely on color</li>
          <li><strong>Scalable Text:</strong> Support for browser zoom up to 200% without horizontal scrolling</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Payment Security Technologies</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>TLS 1.3:</strong> Secure data transmission with accessibility maintained</li>
          <li><strong>PCI DSS:</strong> Payment Card Industry security standards with accessible interfaces</li>
          <li><strong>Tokenization:</strong> Secure payment data handling with accessible user feedback</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default TechnicalSpecifications;