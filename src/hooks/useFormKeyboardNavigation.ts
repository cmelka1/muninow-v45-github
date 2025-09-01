import { useEffect } from 'react';

interface UseFormKeyboardNavigationProps {
  onNext?: () => void;
  onSubmit?: () => void;
  onPrevious?: () => void;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
  currentStep?: number;
  totalSteps?: number;
  skipOn?: string[]; // Element types to skip (e.g., ['textarea'])
}

export const useFormKeyboardNavigation = ({
  onNext,
  onSubmit,
  onPrevious,
  isNextDisabled = false,
  isSubmitDisabled = false,
  currentStep = 1,
  totalSteps = 1,
  skipOn = ['textarea']
}: UseFormKeyboardNavigationProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if focus is on excluded elements
      const activeElement = document.activeElement as HTMLElement;
      if (skipOn.includes(activeElement?.tagName?.toLowerCase())) {
        return;
      }

      // Handle Enter key
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        
        const isLastStep = currentStep >= totalSteps;
        
        if (isLastStep && onSubmit && !isSubmitDisabled) {
          onSubmit();
        } else if (!isLastStep && onNext && !isNextDisabled) {
          onNext();
        }
      }
      
      // Handle Shift + Enter for previous step
      if (event.key === 'Enter' && event.shiftKey && onPrevious && currentStep > 1) {
        event.preventDefault();
        onPrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onSubmit, onPrevious, isNextDisabled, isSubmitDisabled, currentStep, totalSteps, skipOn]);
};