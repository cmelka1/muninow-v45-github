import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, Bell, Smartphone, CreditCard, FileText, Users, Zap } from 'lucide-react';

export const FeaturesSection = () => {
  const features = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Your payment information is protected with military-grade encryption and multi-factor authentication."
    },
    {
      icon: Clock,
      title: "24/7 Availability", 
      description: "Pay your bills anytime, anywhere. Our platform is available around the clock for your convenience."
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Never miss a due date with customizable email and SMS reminders for all your municipal bills."
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Full functionality on any device. Pay bills on-the-go with our responsive mobile experience."
    },
    {
      icon: CreditCard,
      title: "Multiple Payment Options",
      description: "Pay with credit cards, debit cards, or bank transfers. Choose what works best for you."
    },
    {
      icon: FileText,
      title: "Digital Receipts",
      description: "Instant confirmation and downloadable receipts for all transactions. Perfect for record keeping."
    },
    {
      icon: Users,
      title: "Family Accounts",
      description: "Manage multiple properties and family members' bills from a single secure account."
    },
    {
      icon: Zap,
      title: "Instant Processing",
      description: "Payments are processed immediately with real-time confirmation and municipal updates."
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
            <span className="text-sm font-medium text-primary">Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Manage Municipal Payments
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to make paying municipal bills effortless, 
            secure, and convenient for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-background">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};