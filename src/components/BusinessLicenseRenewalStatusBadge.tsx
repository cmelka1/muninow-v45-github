import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle, Ban } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BusinessLicenseRenewalStatusBadgeProps {
  renewalStatus: string;
  expiresAt?: string;
  className?: string;
}

export const BusinessLicenseRenewalStatusBadge = ({ 
  renewalStatus, 
  expiresAt,
  className 
}: BusinessLicenseRenewalStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
          label: 'Active',
          icon: Calendar,
        };
      case 'expiring_soon':
        return {
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
          label: 'Expiring Soon',
          icon: Clock,
        };
      case 'requires_renewal':
        return {
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
          label: 'Renewal Required',
          icon: AlertTriangle,
        };
      case 'expired':
        return {
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
          label: 'Expired',
          icon: Ban,
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
          label: status,
          icon: Calendar,
        };
    }
  };

  const getDaysRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const config = getStatusConfig(renewalStatus);
  const Icon = config.icon;
  const daysRemaining = getDaysRemaining();

  const tooltipContent = daysRemaining !== null 
    ? `${daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}`
    : 'No expiration date set';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${config.className} ${className || ''} flex items-center gap-1`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
