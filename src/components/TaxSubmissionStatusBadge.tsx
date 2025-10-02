import { Badge } from '@/components/ui/badge';

interface TaxSubmissionStatusBadgeProps {
  status: string;
  className?: string;
}

export const TaxSubmissionStatusBadge = ({ status, className }: TaxSubmissionStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
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
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-600 hover:bg-gray-50',
          label: status
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