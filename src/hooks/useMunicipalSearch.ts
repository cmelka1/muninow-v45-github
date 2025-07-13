import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MunicipalSearchFilters {
  accountType?: 'resident' | 'business';
  billStatus?: string;
  merchantId?: string;
  category?: string;
  subcategory?: string;
  dueDateRange?: string;
  amountRange?: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseMunicipalSearchParams extends PaginationParams {
  searchTerm?: string;
  filters?: MunicipalSearchFilters;
}

export interface SearchResult {
  user_id: string;
  profile_id: string;
  account_type: string;
  first_name: string | null;
  last_name: string | null;
  business_legal_name: string | null;
  email: string;
  phone: string | null;
  street_address: string | null;
  apt_number: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bill_count: number;
  total_amount_due_cents: number;
  last_bill_date: string | null;
  external_customer_name: string | null;
  external_business_name: string | null;
  external_customer_address_line1: string | null;
  external_customer_city: string | null;
  external_customer_state: string | null;
  external_customer_zip_code: string | null;
}

export const useMunicipalSearch = (params?: UseMunicipalSearchParams) => {
  const { profile } = useAuth();
  const { page = 1, pageSize = 10, searchTerm = '', filters = {} } = params || {};

  return useQuery({
    queryKey: ['municipal-search', profile?.customer_id, page, pageSize, searchTerm, filters],
    queryFn: async () => {
      if (!profile?.customer_id || profile.account_type !== 'municipal') {
        return { data: [], count: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build the complex search query
      let query = supabase
        .from('master_bills')
        .select(`
          user_id,
          profile_id,
          first_name,
          last_name,
          email,
          business_legal_name,
          street_address,
          apt_number,
          city,
          state,
          zip_code,
          account_type,
          external_customer_name,
          external_business_name,
          external_customer_address_line1,
          external_customer_city,
          external_customer_state,
          external_customer_zip_code,
          amount_due_cents,
          payment_status,
          category,
          subcategory,
          due_date,
          created_at
        `, { count: 'exact' })
        .eq('customer_id', profile.customer_id)
        .not('user_id', 'is', null);

      // Apply search term if provided
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`;
        query = query.or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},business_legal_name.ilike.${searchPattern},external_customer_name.ilike.${searchPattern},external_business_name.ilike.${searchPattern},street_address.ilike.${searchPattern},external_customer_address_line1.ilike.${searchPattern},apt_number.ilike.${searchPattern},email.ilike.${searchPattern}`);
      }

      // Apply filters
      if (filters.accountType) {
        query = query.eq('account_type', filters.accountType);
      }

      if (filters.billStatus) {
        query = query.eq('bill_status', filters.billStatus as any);
      }

      if (filters.merchantId) {
        query = query.eq('merchant_id', filters.merchantId);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.subcategory) {
        query = query.eq('subcategory', filters.subcategory);
      }

      if (filters.dueDateRange) {
        const now = new Date();
        switch (filters.dueDateRange) {
          case 'next_7_days':
            const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            query = query.gte('due_date', now.toISOString()).lte('due_date', next7Days.toISOString());
            break;
          case 'next_30_days':
            const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            query = query.gte('due_date', now.toISOString()).lte('due_date', next30Days.toISOString());
            break;
          case 'past_due':
            query = query.lt('due_date', now.toISOString());
            break;
        }
      }

      if (filters.amountRange) {
        switch (filters.amountRange) {
          case '0-100':
            query = query.gte('amount_due_cents', 0).lte('amount_due_cents', 10000);
            break;
          case '101-500':
            query = query.gte('amount_due_cents', 10100).lte('amount_due_cents', 50000);
            break;
          case '501-1000':
            query = query.gte('amount_due_cents', 50100).lte('amount_due_cents', 100000);
            break;
          case '1000+':
            query = query.gte('amount_due_cents', 100000);
            break;
        }
      }

      const { data: rawData, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching search results:', error);
        throw error;
      }

      // Group by user and aggregate bill data
      const userMap = new Map<string, SearchResult>();
      
      rawData?.forEach((bill) => {
        const userId = bill.user_id;
        
        if (!userMap.has(userId)) {
          // Determine display name and address
          const displayName = bill.account_type === 'business' 
            ? (bill.business_legal_name || bill.external_business_name || 'Unknown Business')
            : `${bill.first_name || ''} ${bill.last_name || ''}`.trim() || bill.external_customer_name || 'Unknown User';

          const address = bill.street_address || bill.external_customer_address_line1 || '';
          const city = bill.city || bill.external_customer_city || '';
          const state = bill.state || bill.external_customer_state || '';
          const zipCode = bill.zip_code || bill.external_customer_zip_code || '';

          userMap.set(userId, {
            user_id: userId,
            profile_id: bill.profile_id,
            account_type: bill.account_type,
            first_name: bill.first_name,
            last_name: bill.last_name,
            business_legal_name: bill.business_legal_name,
            email: bill.email,
            phone: null, // We'd need to join with profiles table for this
            street_address: address,
            apt_number: bill.apt_number,
            city: city,
            state: state,
            zip_code: zipCode,
            bill_count: 0,
            total_amount_due_cents: 0,
            last_bill_date: bill.due_date,
            external_customer_name: bill.external_customer_name,
            external_business_name: bill.external_business_name,
            external_customer_address_line1: bill.external_customer_address_line1,
            external_customer_city: bill.external_customer_city,
            external_customer_state: bill.external_customer_state,
            external_customer_zip_code: bill.external_customer_zip_code,
          });
        }

        const user = userMap.get(userId)!;
        user.bill_count += 1;
        user.total_amount_due_cents += Number(bill.amount_due_cents) || 0;
        
        // Update last bill date if this bill is more recent
        if (!user.last_bill_date || new Date(bill.due_date) > new Date(user.last_bill_date)) {
          user.last_bill_date = bill.due_date;
        }
      });

      const aggregatedData = Array.from(userMap.values());
      
      return { 
        data: aggregatedData, 
        count: count || 0,
        uniqueUsers: aggregatedData.length 
      };
    },
    enabled: !!profile?.customer_id && profile.account_type === 'municipal',
  });
};

export const useMunicipalSearchFilterOptions = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['municipal-search-filter-options', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id || profile.account_type !== 'municipal') {
        return { categories: [], subcategories: [], billStatuses: [], merchants: [] };
      }

      // Fetch categories, subcategories, and merchants from database
      const [categoriesRes, subcategoriesRes, merchantsRes] = await Promise.all([
        supabase
          .from('master_bills')
          .select('category')
          .eq('customer_id', profile.customer_id)
          .not('category', 'is', null),
        supabase
          .from('master_bills')
          .select('subcategory')
          .eq('customer_id', profile.customer_id)
          .not('subcategory', 'is', null),
        supabase
          .from('merchants')
          .select('id, merchant_name')
          .eq('customer_id', profile.customer_id)
          .order('merchant_name')
      ]);

      if (categoriesRes.error) {
        console.error('Error fetching categories:', categoriesRes.error);
        throw categoriesRes.error;
      }

      if (subcategoriesRes.error) {
        console.error('Error fetching subcategories:', subcategoriesRes.error);
        throw subcategoriesRes.error;
      }

      if (merchantsRes.error) {
        console.error('Error fetching merchants:', merchantsRes.error);
        throw merchantsRes.error;
      }

      const categories = [...new Set(categoriesRes.data.map(item => item.category))].sort();
      const subcategories = [...new Set(subcategoriesRes.data.map(item => item.subcategory))].sort();
      const merchants = merchantsRes.data || [];
      // Return all possible bill statuses from the database enum
      const billStatuses = ['unpaid', 'overdue', 'delinquent', 'paid', 'cancelled', 'disputed', 'refunded'];

      return { categories, subcategories, billStatuses, merchants };
    },
    enabled: !!profile?.customer_id && profile.account_type === 'municipal',
  });
};