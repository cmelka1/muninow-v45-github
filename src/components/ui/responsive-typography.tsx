import React from 'react';
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation';
import { typography } from '@/utils/responsiveTokens';

interface ResponsiveTypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'body' | 'small' | 'caption';
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const ResponsiveTypography: React.FC<ResponsiveTypographyProps> = ({
  variant,
  children,
  className = '',
  as
}) => {
  const { isMobile } = useResponsiveNavigation();
  
  const baseClasses = isMobile ? typography.mobile[variant] : typography.desktop[variant];
  
  // Determine the HTML element to render
  const getElement = () => {
    if (as) return as;
    
    switch (variant) {
      case 'h1': return 'h1';
      case 'h2': return 'h2';
      case 'h3': return 'h3';
      case 'h4': return 'h4';
      case 'h5': return 'h5';
      case 'caption':
      case 'small': return 'span';
      default: return 'p';
    }
  };
  
  const Element = getElement();
  
  return React.createElement(
    Element,
    {
      className: `${baseClasses} ${className}`.trim()
    },
    children
  );
};

export default ResponsiveTypography;