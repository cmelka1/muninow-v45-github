import { useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export const useResponsiveNavigation = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isOpen]);

  return {
    isMobile,
    isOpen,
    setIsOpen,
    toggleOpen: () => setIsOpen(!isOpen),
    closeMenu: () => setIsOpen(false)
  };
};