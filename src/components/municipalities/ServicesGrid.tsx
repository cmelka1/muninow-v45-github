import React from 'react';
import ServiceCard from './ServiceCard';
import { MunicipalService } from '@/types';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import ResponsiveContainer from '@/components/ui/responsive-container';

const services: MunicipalService[] = [
  {
    id: '6',
    name: 'Automatic Data Reconciliation',
    description: 'Automates data reconciliation across all IT systems, including ERP, permitting, licensing, and ticketing platforms.',
    category: 'automation',
    features: ['ERP Integration', 'Real-time Sync', 'Error Reduction'],
    icon: 'refresh-ccw'
  },
  {
    id: '1',
    name: 'Comprehensive Dashboard',
    description: 'A unified platform to monitor all payment activities, track revenue, and manage resident accounts in real-time.',
    category: 'management',
    features: ['Real-time Monitoring', 'Revenue Tracking', 'Account Management'],
    icon: 'bar-chart'
  },
  {
    id: '2',
    name: 'Resident Management',
    description: 'Easily manage resident accounts, view payment history, and send personalized communications when needed.',
    category: 'management',
    features: ['Account Management', 'Payment History', 'Communication Tools'],
    icon: 'users'
  },
  {
    id: '3',
    name: 'Payment Reconciliation',
    description: 'Automatic verification and reconciliation of payments with your existing financial systems for accurate bookkeeping.',
    category: 'finance',
    features: ['Automatic Verification', 'System Integration', 'Accurate Bookkeeping'],
    icon: 'check-circle'
  },
  {
    id: '4',
    name: 'Scheduled Payment Cycles',
    description: 'Set up recurring payment cycles with automated notification schedules to ensure timely collections.',
    category: 'payment',
    features: ['Recurring Payments', 'Automated Notifications', 'Timely Collections'],
    icon: 'clock'
  },
  {
    id: '5',
    name: 'Custom Payment Plans',
    description: 'Create flexible payment arrangements for residents with special circumstances or financial hardships.',
    category: 'payment',
    features: ['Flexible Arrangements', 'Custom Plans', 'Financial Assistance'],
    icon: 'credit-card'
  }
];

const ServicesGrid: React.FC = () => {
  return (
    <section className="bg-background">
      <ResponsiveContainer variant="section" maxWidth="6xl">
        <div className="text-center mb-12">
          <ResponsiveTypography variant="h2" className="mb-6">
            Services for Municipalities
          </ResponsiveTypography>
          <ResponsiveTypography variant="body" className="text-muted-foreground max-w-3xl mx-auto text-xl">
            MuniNow offers a suite of tools designed specifically for municipal payment operations.
          </ResponsiveTypography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default ServicesGrid;