import React from 'react';

interface TermsSectionProps {
  title: string;
  children: React.ReactNode;
  id?: string;
}

const TermsSection: React.FC<TermsSectionProps> = ({ title, children, id }) => {
  return (
    <section className="mb-8" id={id}>
      <h2 className="text-2xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="text-muted-foreground">
        {children}
      </div>
    </section>
  );
};

export default TermsSection;