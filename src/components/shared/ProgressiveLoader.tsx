import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgressiveLoaderProps {
  title: string;
  icon?: React.ReactNode;
  isLoading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  skeletonRows?: number;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  title,
  icon,
  isLoading,
  error,
  children,
  skeletonRows = 3
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Error loading {title.toLowerCase()}: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};