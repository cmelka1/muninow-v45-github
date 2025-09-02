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
      
      // Check for basic tag exclusions (textarea)
      if (skipOn.includes(activeElement?.tagName?.toLowerCase())) {
        return;
      }
      
      // Check for contenteditable elements (rich text editors)
      if (activeElement?.contentEditable === 'true') {
        return;
      }
      
      // Check for ProseMirror editor elements (TipTap uses this)
      if (activeElement?.classList?.contains('ProseMirror')) {
        return;
      }
      
      // Check if we're inside a rich text editor by walking up the DOM
      let element = activeElement;
      while (element && element !== document.body) {
        if (element.contentEditable === 'true' || 
            element.classList?.contains('ProseMirror') ||
            element.classList?.contains('tiptap')) {
          return;
        }
        element = element.parentElement as HTMLElement;
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