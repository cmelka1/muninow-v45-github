import { z } from 'zod';

// Define the Finix seller identity schema
export const finixSellerSchema = z.object({
  business_type: z.enum([
    'INDIVIDUAL_SOLE_PROPRIETORSHIP',
    'LIMITED_LIABILITY_COMPANY', 
    'CORPORATION',
    'PARTNERSHIP',
    'NON_PROFIT',
    'GOVERNMENT_AGENCY'
  ]),
  business_name: z.string().min(1, 'Business name is required'),
  business_tax_id: z.string().min(9, 'Tax ID must be at least 9 digits'),
  business_phone: z.string().min(10, 'Phone number is required'),
  business_url: z.string().url().optional().or(z.literal('')),
  incorporation_date: z.string(),
  ownership_type: z.enum(['PRIVATE', 'PUBLIC', 'GOVERNMENT']),
  doing_business_as: z.string().optional(),
  business_address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    region: z.string().min(2, 'State is required'),
    postal_code: z.string().min(5, 'Zip code is required'),
    country: z.string().default('USA')
  }),
  principal: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    title: z.enum(['CEO', 'CFO', 'COO', 'President', 'Owner', 'Partner', 'Director', 'Manager', 'Other']),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Phone number is required'),
    date_of_birth: z.string(),
    ssn: z.string().length(4, 'Last 4 digits of SSN required'),
    address: z.object({
      line1: z.string().min(1, 'Address line 1 is required'),
      line2: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      region: z.string().min(2, 'State is required'),
      postal_code: z.string().min(5, 'Zip code is required'),
      country: z.string().default('USA')
    })
  }).optional()
}).refine((data) => {
  // Principal is required for all business types except GOVERNMENT_AGENCY
  if (data.business_type !== 'GOVERNMENT_AGENCY' && !data.principal) {
    return false;
  }
  return true;
}, {
  message: "Control owner information is required for this business type",
  path: ["principal"]
});

export type FinixSellerFormData = z.infer<typeof finixSellerSchema>;

export const businessTypeOptions = [
  { label: 'Individual / Sole Proprietor', value: 'INDIVIDUAL_SOLE_PROPRIETORSHIP' },
  { label: 'Limited Liability Company (LLC)', value: 'LIMITED_LIABILITY_COMPANY' },
  { label: 'Corporation', value: 'CORPORATION' },
  { label: 'Partnership', value: 'PARTNERSHIP' },
  { label: 'Non-Profit', value: 'NON_PROFIT' },
  { label: 'Government Agency', value: 'GOVERNMENT_AGENCY' }
];

export const ownershipTypeOptions = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Government', value: 'GOVERNMENT' }
];

export const titleOptions = [
  { label: 'CEO', value: 'CEO' },
  { label: 'CFO', value: 'CFO' },
  { label: 'COO', value: 'COO' },
  { label: 'President', value: 'President' },
  { label: 'Owner', value: 'Owner' },
  { label: 'Partner', value: 'Partner' },
  { label: 'Director', value: 'Director' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Other', value: 'Other' }
];

export const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Phone number formatting utility
export const formatPhoneNumber = (value: string, previousValue: string = '') => {
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  const previousPhoneNumber = previousValue.replace(/\D/g, '');
  
  // If user is deleting (current length is less than previous), don't format immediately
  if (phoneNumber.length < previousPhoneNumber.length) {
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  }
  
  // Format as (xxx) xxx-xxxx for normal typing
  if (phoneNumber.length >= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  } else if (phoneNumber.length >= 3) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else {
    return phoneNumber;
  }
};

export const defaultFormValues: FinixSellerFormData = {
  business_type: undefined,
  business_name: '',
  business_tax_id: '',
  business_phone: '',
  business_url: '',
  incorporation_date: '',
  ownership_type: 'PRIVATE',
  doing_business_as: '',
  business_address: {
    line1: '',
    line2: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'USA'
  },
  principal: {
    first_name: '',
    last_name: '',
    title: undefined,
    email: '',
    phone: '',
    date_of_birth: '',
    ssn: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      region: '',
      postal_code: '',
      country: 'USA'
    }
  }
};