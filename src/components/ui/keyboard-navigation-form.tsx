import React from 'react';
import { useFormKeyboardNavigation } from '@/hooks/useFormKeyboardNavigation';

interface KeyboardNavigationFormProps {
  children: React.ReactNode;
  onNext?: () => void;
  onSubmit?: () => void;
  onPrevious?: () => void;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
  currentStep?: number;
  totalSteps?: number;
  skipOn?: string[];
  className?: string;
}

export const KeyboardNavigationForm: React.FC<KeyboardNavigationFormProps> = ({
  children,
  onNext,
  onSubmit,
  onPrevious,
  isNextDisabled = false,
  isSubmitDisabled = false,
  currentStep = 1,
  totalSteps = 1,
  skipOn = ['textarea'],
  className = ''
}) => {
  useFormKeyboardNavigation({
    onNext,
    onSubmit,
    onPrevious,
    isNextDisabled,
    isSubmitDisabled,
    currentStep,
    totalSteps,
    skipOn
  });

  return (
    <div className={className}>
      {children}
    </div>
  );
};