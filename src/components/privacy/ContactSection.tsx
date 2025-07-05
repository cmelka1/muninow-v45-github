import React from 'react';
import PrivacyPolicySection from './PrivacyPolicySection';

const ContactSection: React.FC = () => {
  return (
    <>
      <PrivacyPolicySection title="17. Contact Information">
        <p className="mb-4">
          If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
        </p>
        <div className="mb-4">
          <p className="mb-1"><strong>Muni Now, Inc.</strong></p>
          <p className="mb-1">Email: <a href="mailto:contact@muninow.com" className="text-primary hover:underline">contact@muninow.com</a></p>
        </div>
      </PrivacyPolicySection>
    </>
  );
};

export default ContactSection;