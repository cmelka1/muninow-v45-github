import React from 'react';


interface GooglePayButtonProps {
  isSelected: boolean;
  onSelect: () => void;
  isDisabled?: boolean;
}

const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  isSelected,
  onSelect,
  isDisabled = false
}) => {
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !isDisabled && onSelect()}
    >
      <div className="flex items-center justify-center">
        <img 
          src="/lovable-uploads/c2b3d2f7-9a1c-480f-9b7f-eca749490b01.png"
          alt="Google Pay"
          className="h-6 w-auto object-contain"
        />
      </div>
    </div>
  );
};

export default GooglePayButton;