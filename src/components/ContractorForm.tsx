import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2';
import { Trash2 } from 'lucide-react';
import { normalizePhoneInput } from '@/lib/phoneUtils';

const contractorTypes = [
  'General',
  'Electrical',
  'Plumbing',
  'Fire Suppression',
  'Fire Alarm',
  'Demolition',
  'Site Cleanup / Debris Removal',
  'HVAC',
  'Roofing',
  'Masonry',
  'Carpentry',
  'Excavation / Grading',
  'Concrete',
  'Low-Voltage / Communications',
  'Other (Specify)'
];

export interface ContractorInfo {
  id: string;
  contractor_type: string;
  contractor_name: string;
  phone: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface ContractorFormProps {
  contractor: ContractorInfo;
  index: number;
  onUpdate: (id: string, field: keyof ContractorInfo, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const ContractorForm: React.FC<ContractorFormProps> = ({
  contractor,
  index,
  onUpdate,
  onRemove,
  canRemove
}) => {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = normalizePhoneInput(e.target.value);
    onUpdate(contractor.id, 'phone', formattedValue);
  };

  const handleAddressSelect = (addressComponents: any) => {
    onUpdate(contractor.id, 'street_address', addressComponents.streetAddress);
    onUpdate(contractor.id, 'city', addressComponents.city);
    onUpdate(contractor.id, 'state', addressComponents.state);
    onUpdate(contractor.id, 'zip_code', addressComponents.zipCode);
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Contractor {index + 1}</h4>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(contractor.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`contractor-type-${contractor.id}`}>
            Contractor Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={contractor.contractor_type}
            onValueChange={(value) => onUpdate(contractor.id, 'contractor_type', value)}
          >
            <SelectTrigger id={`contractor-type-${contractor.id}`}>
              <SelectValue placeholder="Select contractor type" />
            </SelectTrigger>
            <SelectContent>
              {contractorTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`contractor-name-${contractor.id}`}>
            Name/Company <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`contractor-name-${contractor.id}`}
            type="text"
            value={contractor.contractor_name}
            onChange={(e) => onUpdate(contractor.id, 'contractor_name', e.target.value)}
            placeholder="Enter contractor or company name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`contractor-phone-${contractor.id}`}>
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`contractor-phone-${contractor.id}`}
            type="tel"
            value={contractor.phone}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            maxLength={14}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`contractor-email-${contractor.id}`}>
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`contractor-email-${contractor.id}`}
            type="email"
            value={contractor.email}
            onChange={(e) => onUpdate(contractor.id, 'email', e.target.value)}
            placeholder="contractor@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address <span className="text-destructive">*</span></Label>
        <GooglePlacesAutocompleteV2
          placeholder="Enter contractor address"
          onAddressSelect={handleAddressSelect}
          value={contractor.street_address}
          onChange={(value) => onUpdate(contractor.id, 'street_address', value)}
        />
        {contractor.city && contractor.state && (
          <div className="text-sm text-muted-foreground">
            {contractor.city}, {contractor.state} {contractor.zip_code}
          </div>
        )}
      </div>
    </div>
  );
};