import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  height?: string;
}

const LazyLoadingWrapper: React.FC<LazyLoadingWrapperProps> = ({
  children,
  fallback,
  className = "",
  height = "auto"
}) => {
  const defaultFallback = (
    <div className={`space-y-4 ${className}`} style={{ height }}>
      <div className="animate-pulse">
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyLoadingWrapper;