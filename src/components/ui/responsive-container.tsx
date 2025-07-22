
import React from 'react';
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation';
import { contentSpacing } from '@/utils/responsiveTokens';

interface ResponsiveContainerProps {
  variant?: 'section' | 'container' | 'card' | 'hero';
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  variant = 'container',
  children,
  className = '',
  maxWidth = '7xl'
}) => {
  const { isMobile } = useResponsiveNavigation();
  
  const spacingClasses = isMobile ? contentSpacing.mobile[variant] : contentSpacing.desktop[variant];
  
  const maxWidthClass = maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth}`;
  
  return (
    <div className={`
      ${spacingClasses}
      ${maxWidthClass}
      mx-auto
      ${className}
    `}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
