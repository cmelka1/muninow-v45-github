import React from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface SafeHtmlRendererProps {
  content: string | null | undefined;
  className?: string;
  fallback?: string;
}

export const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({ 
  content, 
  className,
  fallback = 'No content provided' 
}) => {
  if (!content) {
    return <p className={cn("text-muted-foreground", className)}>{fallback}</p>;
  }

  // Configure DOMPurify to allow common rich text formatting
  const cleanHtml = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none",
        "prose-p:text-base prose-p:leading-relaxed prose-p:mb-3",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-em:italic prose-em:text-foreground",
        "prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-3",
        "prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-3",
        "prose-li:mb-1",
        "prose-headings:text-foreground prose-headings:font-semibold",
        "text-foreground",
        className
      )}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};