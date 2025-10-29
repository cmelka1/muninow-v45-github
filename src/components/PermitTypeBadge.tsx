import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PermitTypeBadgeProps {
  standardType: string;
  municipalLabel?: string | null;
  variant?: 'default' | 'compact' | 'detailed';
  showTooltip?: boolean;
  className?: string;
}

const getPermitTypeColor = (type: string): string => {
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('residential')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
  if (lowerType.includes('commercial')) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
  if (lowerType.includes('demolition')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
  if (lowerType.includes('electrical')) return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
  if (lowerType.includes('plumbing')) return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800';
  if (lowerType.includes('mechanical')) return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
  if (lowerType.includes('renovation') || lowerType.includes('remodel')) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
  
  // Default color
  return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
};

const formatPermitType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const PermitTypeBadge: React.FC<PermitTypeBadgeProps> = ({
  standardType,
  municipalLabel,
  variant = 'default',
  showTooltip = true,
  className
}) => {
  // Use municipal label if available, otherwise use standard type
  const displayLabel = municipalLabel || standardType;
  const isCustomized = municipalLabel && municipalLabel !== standardType;
  const colorClass = getPermitTypeColor(displayLabel);
  
  const badgeContent = (
    <Badge 
      variant="outline" 
      className={cn(
        colorClass,
        variant === 'compact' && 'text-xs px-2 py-0.5',
        variant === 'detailed' && 'text-sm px-3 py-1',
        'font-medium',
        className
      )}
    >
      {formatPermitType(displayLabel)}
      {isCustomized && variant === 'detailed' && (
        <span className="ml-1.5 text-xs opacity-70">(Custom)</span>
      )}
    </Badge>
  );

  // Show tooltip when labels differ and tooltip is enabled
  if (showTooltip && isCustomized) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Municipal Label: {formatPermitType(municipalLabel!)}</p>
              <p className="text-xs text-muted-foreground">Standard Type: {formatPermitType(standardType)}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};
