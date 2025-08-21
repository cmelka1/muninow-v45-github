import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { useMunicipalitySearch } from '@/hooks/useMunicipalitySearch';
import { cn } from '@/lib/utils';

interface Municipality {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

interface MunicipalityAutocompleteProps {
  value?: string;
  onSelect: (municipality: Municipality) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MunicipalityAutocomplete: React.FC<MunicipalityAutocompleteProps> = ({
  value,
  onSelect,
  placeholder = "Search for your municipality...",
  disabled = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { municipalities, isLoading, error } = useMunicipalitySearch(searchTerm);

  // Update input display when value prop changes
  useEffect(() => {
    if (value && !selectedMunicipality) {
      // This is for initial load when a value is already selected
      setSearchTerm('');
    }
  }, [value, selectedMunicipality]);

  const getDisplayName = (municipality: Municipality) => {
    return municipality.doing_business_as;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setSelectedMunicipality(null);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (municipality: Municipality) => {
    setSelectedMunicipality(municipality);
    setSearchTerm(getDisplayName(municipality));
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect(municipality);
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
          prev < municipalities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && municipalities[highlightedIndex]) {
          handleSelect(municipalities[highlightedIndex]);
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
    // Delay closing to allow for click events on dropdown items
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
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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

          {!isLoading && !error && searchTerm.length >= 2 && municipalities.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No municipalities found matching "{searchTerm}"
            </div>
          )}

          {!isLoading && municipalities.length > 0 && (
            <div className="py-1">
              {municipalities.map((municipality, index) => (
                <Button
                  key={municipality.customer_id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left font-normal h-auto p-3 rounded-none",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelect(municipality)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="truncate">
                    {getDisplayName(municipality)}
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