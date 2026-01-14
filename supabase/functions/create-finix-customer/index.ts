import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { FinixAPI } from '../shared/finixAPI.ts';
import { createFinixIdentityPayload, mapBusinessType, formatFinixDate } from '../shared/finixOnboardingUtils.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateFinixCustomerRequest {
  customer_id: string;
  merchant_name: string;
  statement_descriptor: string;
  data_source_system?: string;
  category?: string;
  subcategory?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, merchant_name, statement_descriptor, data_source_system, category, subcategory }: CreateFinixCustomerRequest = await req.json();
    
    if (!customer_id || !merchant_name || !statement_descriptor) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch customer data from customers table
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    if (fetchError || !customer) {
      throw new Error('Customer not found');
    }

    // Initialize Finix API
    const finixAPI = new FinixAPI();

    // Create Finix identity payload using shared utility
    const finixPayload = createFinixIdentityPayload(customer, merchant_name, statement_descriptor);

    // Make API call to Finix
    Logger.info('Creating Finix identity...');
    const finixData = await finixAPI.createIdentity(finixPayload);

    // Helper for date conversion for DB insert
    const toDateObj = (dateJson: any) => {
        if (!dateJson) return null;
        if (dateJson.year && dateJson.month && dateJson.day) {
             return new Date(dateJson.year, dateJson.month - 1, dateJson.day);
        }
        return null; 
    };
    
    // Helper formatted dates for DB insert
    const incorporationDateFnx = formatFinixDate(customer.incorporation_date);
    const dateOfBirthFnx = formatFinixDate(customer.date_of_birth);
    const mappedBusinessType = mapBusinessType(customer.entity_type);

    // Insert merchant record into database (Step 1: Identity created, bank fields left NULL)
    const { data: merchantData, error: insertError } = await supabase
      .from('merchants')
      .insert({
        user_id: customer.user_id,
        customer_id: customer_id,
        finix_identity_id: finixData.id,
        finix_application_id: (finixData as any).application || null,
        
        merchant_name: merchant_name,
        business_name: customer.legal_entity_name,
        statement_descriptor: statement_descriptor,
        
        // Customer data
        customer_first_name: customer.first_name,
        customer_last_name: customer.last_name,
        customer_email: customer.work_email,
        customer_phone: customer.entity_phone,
        customer_street_address: customer.business_address_line1,
        customer_apt_number: customer.business_address_line2,
        customer_city: customer.business_city,
        customer_state: customer.business_state,
        customer_zip_code: customer.business_zip_code,
        customer_country: customer.business_country,
        
        // Business information
        business_type: mappedBusinessType,
        doing_business_as: customer.doing_business_as,
        business_tax_id: customer.tax_id,
        business_phone: customer.entity_phone,
        business_website: customer.entity_website,
        business_description: customer.entity_description,
        incorporation_date: toDateObj(incorporationDateFnx),
        ownership_type: customer.ownership_type,
        business_address_line1: customer.business_address_line1,
        business_address_line2: customer.business_address_line2,
        business_address_city: customer.business_city,
        business_address_state: customer.business_state,
        business_address_zip_code: customer.business_zip_code,
        business_address_country: customer.business_country,
        
        // Owner information
        owner_first_name: customer.first_name,
        owner_last_name: customer.last_name,
        owner_job_title: customer.job_title,
        owner_work_email: customer.work_email,
        owner_personal_phone: customer.personal_phone,
        owner_personal_address_line1: customer.personal_address_line1,
        owner_personal_address_line2: customer.personal_address_line2,
        owner_personal_address_city: customer.personal_city,
        owner_personal_address_state: customer.personal_state,
        owner_personal_address_zip_code: customer.personal_zip_code,
        owner_personal_address_country: customer.personal_country,
        owner_date_of_birth: toDateObj(dateOfBirthFnx),
        owner_personal_tax_id: customer.personal_tax_id,
        owner_ownership_percentage: customer.ownership_percentage,
        
        // Processing information
        annual_ach_volume: customer.annual_ach_volume || 0,
        annual_card_volume: customer.annual_card_volume || 0,
        average_ach_amount: customer.average_ach_amount || 0,
        average_card_amount: customer.average_card_amount || 0,
        max_ach_amount: customer.max_ach_amount || 0,
        max_card_amount: customer.max_card_amount || 0,
        card_present_percentage: customer.card_present_percentage || 0,
        moto_percentage: customer.moto_percentage || 0,
        ecommerce_percentage: customer.ecommerce_percentage || 100,
        b2b_percentage: customer.b2b_percentage || 0,
        b2c_percentage: customer.b2c_percentage || 100,
        p2p_percentage: customer.p2p_percentage || 0,
        mcc_code: customer.mcc_code,
        has_accepted_cards_previously: customer.has_accepted_cards_previously || false,
        refund_policy: customer.refund_policy || "MERCHANDISE_EXCHANGE_ONLY",
        
        // Legal agreements
        merchant_agreement_accepted: true,
        merchant_agreement_ip_address: "42.1.1.113",
        merchant_agreement_timestamp: new Date(),
        merchant_agreement_user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6)",
        credit_check_consent: true,
        credit_check_ip_address: "42.1.1.112",
        credit_check_timestamp: new Date(),
        credit_check_user_agent: "Mozilla 5.0(Macintosh; IntelMac OS X 10 _14_6)",
        
        // Finix response data
        finix_raw_response: finixData,
        finix_entity_data: (finixData as any).entity, 
        finix_tags: finixData.tags,
        processing_status: 'seller_created',
        verification_status: 'pending',
        
        // Internal tracking fields
        data_source_system: data_source_system || null,
        category: category || null,
        subcategory: subcategory || null
      })
      .select()
      .single();

    if (insertError) {
      Logger.error('Database insert error', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    Logger.info('Finix customer created successfully', { merchant_id: merchantData.id });

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchantData.id,
        finix_identity_id: finixData.id,
        status: 'seller_created'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    Logger.error('Error creating Finix customer', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});