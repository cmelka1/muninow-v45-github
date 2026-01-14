import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  entity_type: string;
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface CustomerFormData {
  // Step 1
  entityType: string;
  ownershipType: string;
  legalEntityName: string;
  doingBusinessAs: string;
  taxId: string;
  entityPhone: string;
  entityWebsite: string;
  incorporationDate: Date;
  entityDescription: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Step 2
  firstName: string;
  lastName: string;
  jobTitle: string;
  workEmail: string;
  personalPhone: string;
  dateOfBirth?: Date;
  personalTaxId?: string;
  ownershipPercentage?: number;
  personalAddressLine1: string;
  personalAddressLine2?: string;
  personalCity: string;
  personalState: string;
  personalZipCode: string;
  personalCountry: string;
  
  // Step 3
  annualAchVolume: number;
  annualCardVolume: number;
  averageAchAmount: number;
  averageCardAmount: number;
  maxAchAmount: number;
  maxCardAmount: number;
  mccCode: string;
  cardPresentPercent: number;
  motoPercent: number;
  ecommercePercent: number;
  b2bPercent: number;
  b2cPercent: number;
  p2pPercent: number;
  hasAcceptedCardsPreviously: boolean;
  refundPolicy: string;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCustomers = async (page = 1, pageSize = 10) => {
    if (!user) return { data: [], count: 0 };
    
    setIsLoading(true);
    setError(null);
    
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setCustomers(data || []);
      return { data: data || [], count: count || 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
      return { data: [], count: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomer = async (formData: CustomerFormData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Transform form data to database schema
      const customerData = {
        user_id: user.id,
        entity_type: formData.entityType,
        ownership_type: formData.ownershipType,
        legal_entity_name: formData.legalEntityName,
        doing_business_as: formData.doingBusinessAs,
        tax_id: formData.taxId,
        entity_phone: formData.entityPhone,
        entity_website: formData.entityWebsite,
        incorporation_date: formData.incorporationDate ? {
          month: formData.incorporationDate.getMonth() + 1,
          day: formData.incorporationDate.getDate(),
          year: formData.incorporationDate.getFullYear()
        } : null,
        entity_description: formData.entityDescription,
        business_address_line1: formData.addressLine1,
        business_address_line2: formData.addressLine2 || null,
        business_city: formData.city,
        business_state: formData.state,
        business_zip_code: formData.zipCode,
        business_country: formData.country,
        
        // Personal information
        first_name: formData.firstName,
        last_name: formData.lastName,
        job_title: formData.jobTitle,
        work_email: formData.workEmail,
        personal_phone: formData.personalPhone,
        date_of_birth: formData.dateOfBirth ? {
          month: formData.dateOfBirth.getMonth() + 1,
          day: formData.dateOfBirth.getDate(),
          year: formData.dateOfBirth.getFullYear()
        } : null,
        personal_tax_id: formData.personalTaxId || null,
        ownership_percentage: formData.ownershipPercentage || null,
        personal_address_line1: formData.personalAddressLine1,
        personal_address_line2: formData.personalAddressLine2 || null,
        personal_city: formData.personalCity,
        personal_state: formData.personalState,
        personal_zip_code: formData.personalZipCode,
        personal_country: formData.personalCountry,
        
        // Processing information
        annual_ach_volume: formData.annualAchVolume,
        annual_card_volume: formData.annualCardVolume,
        average_ach_amount: formData.averageAchAmount,
        average_card_amount: formData.averageCardAmount,
        max_ach_amount: formData.maxAchAmount,
        max_card_amount: formData.maxCardAmount,
        mcc_code: formData.mccCode,
        card_present_percentage: formData.cardPresentPercent,
        moto_percentage: formData.motoPercent,
        ecommerce_percentage: formData.ecommercePercent,
        b2b_percentage: formData.b2bPercent,
        b2c_percentage: formData.b2cPercent,
        p2p_percentage: formData.p2pPercent,
        has_accepted_cards_previously: formData.hasAcceptedCardsPreviously,
        refund_policy: formData.refundPolicy.toUpperCase(),
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer created successfully",
      });

      // Refresh the customers list
      await fetchCustomers();
      
      return data;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errMessage);
      
      // Provide specific error messages for common issues
      let errorMessage = errMessage;
      if (errMessage.includes('row-level security policy')) {
        errorMessage = "Access denied. You need superAdmin privileges to create customers. Please contact your administrator.";
      } else if (errMessage.includes('permission denied')) {
        errorMessage = "Permission denied. Please ensure you have the required role to perform this action.";
      }
      
      toast({
        title: "Error",
        description: `Failed to create customer: ${errorMessage}`,
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerById = async (customerId: string) => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) throw error;

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to fetch customer details",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customers,
    isLoading,
    error,
    fetchCustomers,
    fetchCustomerById,
    createCustomer
  };
};