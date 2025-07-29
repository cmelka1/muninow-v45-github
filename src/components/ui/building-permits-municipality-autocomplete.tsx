import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { useBuildingPermitsMerchants } from '@/hooks/useBuildingPermitsMerchants';
import { cn } from '@/lib/utils';

interface BuildingPermitsMerchant {
  id: string;
  merchant_name: string;
  business_name: string;
  customer_city: string;
  customer_state: string;
}

interface BuildingPermitsMunicipalityAutocompleteProps {
  value?: string;
  onSelect: (merchant: BuildingPermitsMerchant) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const BuildingPermitsMunicipalityAutocomplete: React.FC<BuildingPermitsMunicipalityAutocompleteProps> = ({
  value,
  onSelect,
  placeholder = "Search for municipality...",
  disabled = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedMerchant, setSelectedMerchant] = useState<BuildingPermitsMerchant | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { merchants, isLoading, error } = useBuildingPermitsMerchants(searchTerm);

  // Update input display when value prop changes
  useEffect(() => {
    if (value && !selectedMerchant) {
      setSearchTerm('');
    }
  }, [value, selectedMerchant]);

  const getDisplayName = (merchant: BuildingPermitsMerchant) => {
    return merchant.merchant_name;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setSelectedMerchant(null);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (merchant: BuildingPermitsMerchant) => {
    setSelectedMerchant(merchant);
    setSearchTerm(getDisplayName(merchant));
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect(merchant);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < merchants.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && merchants[highlightedIndex]) {
          handleSelect(merchants[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    if (searchTerm.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="h-11 pr-10"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto"
        >
          {isLoading && searchTerm.length >= 2 && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {!isLoading && !error && searchTerm.length >= 2 && merchants.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No municipalities found matching "{searchTerm}"
            </div>
          )}

          {!isLoading && merchants.length > 0 && (
            <div className="py-1">
              {merchants.map((merchant, index) => (
                <Button
                  key={merchant.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left font-normal h-auto p-3 rounded-none",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelect(merchant)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="truncate">
                    <div className="font-medium">{getDisplayName(merchant)}</div>
                    {merchant.customer_city && merchant.customer_state && (
                      <div className="text-xs text-muted-foreground">
                        {merchant.customer_city}, {merchant.customer_state}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}

          {searchTerm.length < 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};