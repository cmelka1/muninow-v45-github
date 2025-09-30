import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useServiceTypeOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history-service-type-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('permit_id, business_license_id, service_application_id, tax_submission_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching service type options:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return [];

      // Determine service types from transactions
      const serviceTypes = new Set<string>();
      
      transactions.forEach(transaction => {
        if (transaction.permit_id) {
          serviceTypes.add('Building Permit');
        } else if (transaction.business_license_id) {
          serviceTypes.add('Business License');
        } else if (transaction.service_application_id) {
          serviceTypes.add('Service');
        } else if (transaction.tax_submission_id) {
          serviceTypes.add('Tax');
        }
      });

      return Array.from(serviceTypes).sort();
    },
    enabled: !!user?.id,
  });
};

export const useCategoryOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history-category-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('permit_id, business_license_id, service_application_id, tax_submission_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching category options:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return [];

      const categories = new Set<string>();

      // Get service names for each transaction type
      for (const transaction of transactions) {
        if (transaction.permit_id) {
          const { data: permit } = await supabase
            .from('permit_applications')
            .select('permit_type')
            .eq('permit_id', transaction.permit_id)
            .single();
          if (permit?.permit_type) categories.add(permit.permit_type);
        } else if (transaction.business_license_id) {
          const { data: license } = await supabase
            .from('business_license_applications')
            .select('business_type')
            .eq('id', transaction.business_license_id)
            .single();
          if (license?.business_type) categories.add(license.business_type);
        } else if (transaction.service_application_id) {
          const { data: serviceApp } = await supabase
            .from('municipal_service_applications')
            .select('tile_id')
            .eq('id', transaction.service_application_id)
            .single();
          
          if (serviceApp?.tile_id) {
            const { data: tile } = await supabase
              .from('municipal_service_tiles')
              .select('title')
              .eq('id', serviceApp.tile_id)
              .single();
            if (tile?.title) categories.add(tile.title);
          }
        } else if (transaction.tax_submission_id) {
          const { data: tax } = await supabase
            .from('tax_submissions')
            .select('tax_type')
            .eq('id', transaction.tax_submission_id)
            .single();
          if (tax?.tax_type) {
            const formattedTaxType = tax.tax_type.includes('_') 
              ? tax.tax_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
              : tax.tax_type;
            categories.add(formattedTaxType);
          }
        }
      }

      return Array.from(categories).sort();
    },
    enabled: !!user?.id,
  });
};

export const usePaymentMethodOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history-payment-method-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('payment_type, card_brand')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching payment method options:', error);
        throw error;
      }

      // Get unique payment methods
      const paymentMethods = new Set<string>();
      
      data.forEach(payment => {
        if (payment.payment_type === 'GOOGLE_PAY') {
          paymentMethods.add('Google Pay');
        } else if (payment.payment_type === 'APPLE_PAY') {
          paymentMethods.add('Apple Pay');
        } else if (payment.payment_type === 'BANK_ACCOUNT') {
          paymentMethods.add('Bank Account');
        } else if (payment.payment_type === 'PAYMENT_CARD' || payment.card_brand) {
          paymentMethods.add('Card');
        }
      });

      return Array.from(paymentMethods).sort();
    },
    enabled: !!user?.id,
  });
};