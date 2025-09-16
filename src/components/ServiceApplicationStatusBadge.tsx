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
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
          label: 'Draft'
        };
      case 'submitted':
        return {
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          label: 'Submitted'
        };
      case 'under_review':
        return {
          variant: 'default' as const,
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
          label: 'Under Review'
        };
      case 'information_requested':
        return {
          variant: 'default' as const,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
          label: 'Information Requested'
        };
      case 'resubmitted':
        return {
          variant: 'default' as const,
          className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
          label: 'Resubmitted'
        };
      case 'approved':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
          label: 'Approved'
        };
      case 'denied':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
          label: 'Denied'
        };
      case 'rejected':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
          label: 'Rejected'
        };
      case 'withdrawn':
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
          label: 'Withdrawn'
        };
      case 'expired':
        return {
          variant: 'secondary' as const,
          className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
          label: 'Expired'
        };
      case 'issued':
        return {
          variant: 'default' as const,
          className: 'bg-blue-600 text-white hover:bg-blue-600',
          label: 'Issued'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-600 hover:bg-gray-50',
          label: status.replace('_', ' ').toUpperCase()
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
};

export default ServiceApplicationStatusBadge;