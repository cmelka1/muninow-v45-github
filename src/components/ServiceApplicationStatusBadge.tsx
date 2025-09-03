import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ServiceApplicationStatusBadgeProps {
  status: string;
  className?: string;
}

const ServiceApplicationStatusBadge: React.FC<ServiceApplicationStatusBadgeProps> = ({ 
  status, 
  className = "" 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Draft'
        };
      case 'submitted':
        return {
          variant: 'outline' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Submitted'
        };
      case 'under_review':
        return {
          variant: 'outline' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Under Review'
        };
      case 'information_requested':
        return {
          variant: 'outline' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'Information Requested'
        };
      case 'resubmitted':
        return {
          variant: 'outline' as const,
          className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          label: 'Resubmitted'
        };
      case 'approved':
        return {
          variant: 'outline' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          label: 'Approved'
        };
      case 'denied':
        return {
          variant: 'outline' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          label: 'Denied'
        };
      case 'rejected':
        return {
          variant: 'outline' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          label: 'Rejected'
        };
      case 'withdrawn':
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Withdrawn'
        };
      case 'expired':
        return {
          variant: 'outline' as const,
          className: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Expired'
        };
      case 'issued':
        return {
          variant: 'outline' as const,
          className: 'bg-emerald-600 text-white border-emerald-600',
          label: 'Issued'
        };
      case 'completed':
        return {
          variant: 'outline' as const,
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'Completed'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          label: status.replace('_', ' ').toUpperCase()
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  );
};

export default ServiceApplicationStatusBadge;