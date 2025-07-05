import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Building2, House, BarChart3, Clock, CheckCircle2, RefreshCcw, CreditCard } from 'lucide-react';
import { Feature } from '@/types';

interface FeatureCardProps {
  feature: Feature;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  const IconComponent = () => {
    switch (feature.icon) {
      case 'shield':
        return <Shield className="h-10 w-10 text-primary" aria-hidden="true" />;
      case 'payment-methods':
        return <CreditCard className="h-10 w-10 text-primary" aria-hidden="true" />;
      case 'building-house':
        return (
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
            <House className="h-8 w-8 text-primary -ml-2" aria-hidden="true" />
          </div>
        );
      case 'bar-chart':
        return <BarChart3 className="h-10 w-10 text-primary" aria-hidden="true" />;
      case 'clock':
        return <Clock className="h-10 w-10 text-primary" aria-hidden="true" />;
      case 'check-circle':
        return <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />;
      case 'refresh-ccw':
        return <RefreshCcw className="h-10 w-10 text-primary" aria-hidden="true" />;
      default:
        return <Shield className="h-10 w-10 text-primary" aria-hidden="true" />;
    }
  };

  return (
    <Card className="h-full transition-all hover:shadow-lg border-border">
      <CardHeader className="pb-4">
        <div className="mb-4">
          <IconComponent />
        </div>
        <CardTitle className="text-xl">{feature.title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {feature.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          {feature.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;