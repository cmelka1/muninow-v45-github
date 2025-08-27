import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PermitStatus, getStatusDisplayName } from '@/hooks/usePermitWorkflow';

interface PermitStatusBadgeProps {
  status: PermitStatus;
  className?: string;
}

export const PermitStatusBadge: React.FC<PermitStatusBadgeProps> = ({ 
  status, 
  className 
}) => {
  const getStatusColor = (status: PermitStatus): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'information_requested':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'resubmitted':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'issued':
        return 'bg-blue-600 text-white border-blue-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getStatusColor(status)} ${className}`}
    >
      {getStatusDisplayName(status)}
    </Badge>
  );
};