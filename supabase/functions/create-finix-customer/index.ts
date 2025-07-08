import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateFinixCustomerRequest {
  customer_id: string;
  merchant_name: string;
  statement_descriptor: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, merchant_name, statement_descriptor }: CreateFinixCustomerRequest = await req.json();
    
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

    // Prepare Finix API request
    const finixApiKey = Deno.env.get('FINIX_API_SECRET');
    const finixAppId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    const finixBaseUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    if (!finixApiKey || !finixAppId) {
      throw new Error('Missing Finix API credentials');
    }

    // Format dates for Finix API
    const formatDate = (dateJson: any) => {
      if (!dateJson) return null;
      const date = new Date(dateJson.year, dateJson.month - 1, dateJson.day);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
      };
    };

    const incorporationDate = formatDate(customer.incorporation_date);
    const dateOfBirth = formatDate(customer.date_of_birth);

    // Create Finix identity payload
    const finixPayload = {
      additional_underwriting_data: {
        annual_ach_volume: customer.annual_ach_volume || 0,
        average_ach_transfer_amount: customer.average_ach_amount || 0,
        average_card_transfer_amount: customer.average_card_amount || 0,
        business_description: customer.entity_description,
        card_volume_distribution: {
          card_present_percentage: customer.card_present_percentage || 0,
          mail_order_telephone_order_percentage: customer.moto_percentage || 0,
          ecommerce_percentage: customer.ecommerce_percentage || 100
        },
        credit_check_allowed: true,
        credit_check_ip_address: "42.1.1.112",
        credit_check_timestamp: "2021-04-28T16:42:55Z",
        credit_check_user_agent: "Mozilla 5.0(Macintosh; IntelMac OS X 10 _14_6)",
        merchant_agreement_accepted: true,
        merchant_agreement_ip_address: "42.1.1.113",
        merchant_agreement_timestamp: "2021-04-28T16:42:55Z",
        merchant_agreement_user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6)",
        refund_policy: customer.refund_policy || "MERCHANDISE_EXCHANGE_ONLY",
        volume_distribution_by_business_type: {
          other_volume_percentage: 0,
          consumer_to_consumer_volume_percentage: 0,
          business_to_consumer_volume_percentage: customer.b2c_percentage || 100,
          business_to_business_volume_percentage: customer.b2b_percentage || 0,
          person_to_person_volume_percentage: customer.p2p_percentage || 0
        }
      },
      entity: {
        annual_card_volume: customer.annual_card_volume || 0,
        business_address: {
          city: customer.business_city,
          country: customer.business_country || "USA",
          region: customer.business_state,
          line2: customer.business_address_line2 || null,
          line1: customer.business_address_line1,
          postal_code: customer.business_zip_code
        },
        business_name: customer.legal_entity_name,
        business_phone: customer.entity_phone,
        business_tax_id: customer.tax_id,
        business_type: customer.entity_type,
        default_statement_descriptor: statement_descriptor,
        dob: dateOfBirth,
        doing_business_as: customer.doing_business_as,
        email: customer.work_email,
        first_name: customer.first_name,
        has_accepted_credit_cards_previously: customer.has_accepted_cards_previously || false,
        incorporation_date: incorporationDate,
        last_name: customer.last_name,
        max_transaction_amount: customer.max_card_amount || 0,
        ach_max_transaction_amount: customer.max_ach_amount || 0,
        mcc: customer.mcc_code,
        ownership_type: customer.ownership_type.toUpperCase(),
        personal_address: {
          city: customer.personal_city,
          country: customer.personal_country || "USA",
          region: customer.personal_state,
          line2: customer.personal_address_line2 || null,
          line1: customer.personal_address_line1,
          postal_code: customer.personal_zip_code
        },
        phone: customer.personal_phone,
        principal_percentage_ownership: customer.ownership_percentage || 100,
        tax_id: customer.personal_tax_id || customer.tax_id,
        title: customer.job_title,
        url: customer.entity_website || null
      },
      identity_roles: ["SELLER"],
      tags: {
        "Merchant Name": merchant_name,
        "Customer ID": customer_id
      },
      type: "BUSINESS"
    };

    // Make API call to Finix
    const finixResponse = await fetch(`${finixBaseUrl}/identities`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(finixAppId + ':' + finixApiKey)}`,
        'Accept': 'application/hal+json',
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(finixPayload)
    });

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      throw new Error(`Finix API error: ${finixResponse.status} - ${errorText}`);
    }

    const finixData = await finixResponse.json();

    // Insert merchant record into database
    const { data: merchantData, error: insertError } = await supabase
      .from('merchants')
      .insert({
        user_id: customer.user_id,
        finix_identity_id: finixData.id,
        finix_application_id: finixData.application,
        business_name: merchant_name,
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
        business_type: customer.entity_type,
        doing_business_as: customer.doing_business_as,
        business_tax_id: customer.tax_id,
        business_phone: customer.entity_phone,
        business_website: customer.entity_website,
        business_description: customer.entity_description,
        incorporation_date: incorporationDate ? new Date(incorporationDate.year, incorporationDate.month - 1, incorporationDate.day) : null,
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
        owner_date_of_birth: dateOfBirth ? new Date(dateOfBirth.year, dateOfBirth.month - 1, dateOfBirth.day) : null,
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
        
        // Legal agreements (hardcoded as requested)
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
        finix_entity_data: finixData.entity,
        finix_tags: finixData.tags,
        processing_status: 'seller_created',
        verification_status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

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
    console.error('Error creating Finix customer:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});