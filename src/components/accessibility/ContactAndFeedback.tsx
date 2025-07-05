import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ContactAndFeedback: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback and Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          We welcome your feedback on the accessibility of MuniNow. Please let us know if you encounter accessibility barriers:
        </p>
        
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
          <h3 className="text-lg font-semibold mb-2">Contact Methods</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Email:</strong> <a href="mailto:contact@muninow.com" className="text-primary hover:underline">contact@muninow.com</a></li>
            <li><strong>Phone:</strong> <a href="tel:+16303906636" className="text-primary hover:underline">+1 (630) 390-6636</a></li>
            <li><strong>TTY/TDD:</strong> <a href="tel:711" className="text-primary hover:underline">711 (Relay Service)</a></li>
            <li><strong>Mail:</strong> MuniNow Accessibility Team, 123 Tech Plaza, Suite 400, Boston, MA 02110</li>
          </ul>
        </div>
        
        <h3 className="text-lg font-semibold mt-4">Response Timeline</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>General Feedback:</strong> We respond within 2 business days</li>
          <li><strong>Accessibility Barriers:</strong> Critical issues addressed within 1 business day</li>
          <li><strong>Payment Issues:</strong> Accessibility problems with payments resolved immediately</li>
          <li><strong>Technical Support:</strong> Accessibility-related technical support available during business hours</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Alternative Access Methods</h3>
        <p>
          If you encounter accessibility barriers that prevent you from using our online services, we provide alternative methods:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Phone Assistance:</strong> Complete municipal bill payments over the phone</li>
          <li><strong>In-Person Support:</strong> Municipal office assistance for online services</li>
          <li><strong>Alternative Formats:</strong> Documents and forms in accessible formats upon request</li>
          <li><strong>Assisted Navigation:</strong> Step-by-step assistance with online processes</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Continuous Improvement</h3>
        <p>
          We are committed to ongoing accessibility improvements. Your feedback helps us identify areas for enhancement 
          and ensures our platform serves all community members effectively. We regularly review and update our 
          accessibility practices based on user feedback, technology advances, and regulatory updates.
        </p>
        
        <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/20 mt-4">
          <h3 className="text-lg font-semibold mb-2">Assessment Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Assessment Date:</strong> April 28, 2025</li>
            <li><strong>Next Scheduled Review:</strong> October 28, 2025</li>
            <li><strong>Assessment Method:</strong> Self-evaluation, automated testing, and user testing</li>
            <li><strong>Standards Applied:</strong> WCAG 2.2 Level AA, Section 508 (2018), ADA compliance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactAndFeedback;