import React from 'react';
import { Search, FileCheck, CreditCard } from 'lucide-react';

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: Search,
      title: "Find Your Bills",
      description: "Search by address or account number to instantly locate all your municipal bills in one place.",
      step: "01"
    },
    {
      icon: FileCheck,
      title: "Review & Confirm",
      description: "Verify bill details, amounts, and due dates. View your complete payment history anytime.",
      step: "02"
    },
    {
      icon: CreditCard,
      title: "Pay Securely",
      description: "Complete your payment with bank-level security. Get instant confirmation and digital receipts.",
      step: "03"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes with our simple three-step process. 
            No paperwork, no waiting in line.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative text-center group hover:scale-105 transition-transform duration-300"
            >
              {/* Step number */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{step.step}</span>
              </div>

              {/* Icon */}
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                <step.icon className="w-8 h-8 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Connecting line (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-6 lg:-right-12 w-12 lg:w-24 h-0.5 bg-border"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};