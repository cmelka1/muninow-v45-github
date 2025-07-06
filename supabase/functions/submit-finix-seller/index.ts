import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FinixSellerRequest {
  businessInformation: {
    businessType: string;
    businessName: string;
    doingBusinessAs: string;
    businessTaxId: string;
    businessPhone: string;
    businessWebsite: string;
    businessDescription: string;
    incorporationDate: string;
    ownershipType: string;
    businessAddress: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  ownerInformation: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    workEmail: string;
    personalPhone: string;
    personalAddress: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    dateOfBirth?: string;
    personalTaxId?: string;
    ownershipPercentage?: number;
  };
  processingInformation: {
    annualAchVolume: number;
    annualCardVolume: number;
    averageAchAmount: number;
    averageCardAmount: number;
    maxAchAmount: number;
    maxCardAmount: number;
    cardVolumeDistribution: {
      cardPresent: number;
      moto: number;
      ecommerce: number;
    };
    businessVolumeDistribution: {
      b2b: number;
      b2c: number;
      p2p: number;
    };
    mccCode: string;
    statementDescriptor: string;
    hasAcceptedCardsPreviously: boolean;
    refundPolicy: string;
    merchantAgreementAccepted: boolean;
    merchantAgreementMetadata: {
      ipAddress: string;
      timestamp: string;
      userAgent: string;
    };
    creditCheckConsent?: boolean;
    creditCheckMetadata?: {
      ipAddress: string;
      timestamp: string;
      userAgent: string;
    };
  };
}

function transformToFinixFormat(data: FinixSellerRequest) {
  const { businessInformation, ownerInformation, processingInformation } = data;
  
  // Parse incorporation date
  const incorporationParts = businessInformation.incorporationDate.split('-');
  
  // Parse date of birth if provided
  let dobObject = {};
  if (ownerInformation.dateOfBirth) {
    const dobParts = ownerInformation.dateOfBirth.split('-');
    dobObject = {
      year: parseInt(dobParts[0]),
      month: parseInt(dobParts[1]),
      day: parseInt(dobParts[2])
    };
  }

  return {
    entity: {
      type: "MERCHANT",
      entity_type: businessInformation.businessType,
      name: businessInformation.businessName,
      doing_business_as: businessInformation.doingBusinessAs,
      business_tax_id: businessInformation.businessTaxId,
      business_phone: businessInformation.businessPhone,
      website: businessInformation.businessWebsite,
      description: businessInformation.businessDescription,
      incorporation_date: {
        year: parseInt(incorporationParts[0]),
        month: parseInt(incorporationParts[1]),
        day: parseInt(incorporationParts[2])
      },
      ownership_type: businessInformation.ownershipType,
      business_address: {
        street_address: businessInformation.businessAddress.line1,
        street_address2: businessInformation.businessAddress.line2 || null,
        city: businessInformation.businessAddress.city,
        region: businessInformation.businessAddress.state,
        postal_code: businessInformation.businessAddress.zipCode,
        country: businessInformation.businessAddress.country
      },
      personal_address: {
        street_address: ownerInformation.personalAddress.line1,
        street_address2: ownerInformation.personalAddress.line2 || null,
        city: ownerInformation.personalAddress.city,
        region: ownerInformation.personalAddress.state,
        postal_code: ownerInformation.personalAddress.zipCode,
        country: ownerInformation.personalAddress.country
      },
      first_name: ownerInformation.firstName,
      last_name: ownerInformation.lastName,
      title: ownerInformation.jobTitle,
      email: ownerInformation.workEmail,
      phone: ownerInformation.personalPhone,
      ...(ownerInformation.dateOfBirth && { date_of_birth: dobObject }),
      ...(ownerInformation.personalTaxId && { personal_tax_id: ownerInformation.personalTaxId }),
      ...(ownerInformation.ownershipPercentage && { ownership_percentage: ownerInformation.ownershipPercentage })
    },
    additional_underwriting_data: {
      annual_ach_volume: processingInformation.annualAchVolume,
      annual_card_volume: processingInformation.annualCardVolume,
      average_ach_amount: processingInformation.averageAchAmount,
      average_card_amount: processingInformation.averageCardAmount,
      max_ach_amount: processingInformation.maxAchAmount,
      max_card_amount: processingInformation.maxCardAmount,
      card_present_percentage: processingInformation.cardVolumeDistribution.cardPresent,
      moto_percentage: processingInformation.cardVolumeDistribution.moto,
      ecommerce_percentage: processingInformation.cardVolumeDistribution.ecommerce,
      b2b_percentage: processingInformation.businessVolumeDistribution.b2b,
      b2c_percentage: processingInformation.businessVolumeDistribution.b2c,
      p2p_percentage: processingInformation.businessVolumeDistribution.p2p,
      mcc_code: processingInformation.mccCode,
      statement_descriptor: processingInformation.statementDescriptor,
      has_accepted_cards_previously: processingInformation.hasAcceptedCardsPreviously,
      refund_policy: processingInformation.refundPolicy
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request data
    const requestData: FinixSellerRequest = await req.json();
    
    // Get Finix credentials
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID')!;
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET')!;
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    // Determine API URL based on environment
    const baseUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    // Transform data to Finix format
    const finixPayload = transformToFinixFormat(requestData);
    
    console.log('Submitting to Finix:', JSON.stringify(finixPayload, null, 2));

    // Submit to Finix API
    const finixResponse = await fetch(`${baseUrl}/identities`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.json+api',
        'Content-Type': 'application/vnd.json+api',
        'Finix-Version': '2018-01-01',
        'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`
      },
      body: JSON.stringify(finixPayload)
    });

    const finixResult = await finixResponse.json();
    
    if (!finixResponse.ok) {
      console.error('Finix API Error:', finixResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Finix API error', 
          details: finixResult 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Finix Response:', JSON.stringify(finixResult, null, 2));

    // Generate a unique Finix identity ID for our database
    const finixIdentityId = finixResult.id || `ID_${Date.now()}`;
    
    // Store in customers table
    const customerData = {
      finix_identity_id: finixIdentityId,
      finix_application_id: finixResult.application?.id || null,
      verification_status: finixResult.verification?.status || 'pending',
      
      // Business Information
      business_type: requestData.businessInformation.businessType,
      business_name: requestData.businessInformation.businessName,
      doing_business_as: requestData.businessInformation.doingBusinessAs,
      business_tax_id: requestData.businessInformation.businessTaxId,
      business_phone: requestData.businessInformation.businessPhone,
      business_website: requestData.businessInformation.businessWebsite,
      business_description: requestData.businessInformation.businessDescription,
      incorporation_date: requestData.businessInformation.incorporationDate,
      ownership_type: requestData.businessInformation.ownershipType,
      business_address_line1: requestData.businessInformation.businessAddress.line1,
      business_address_line2: requestData.businessInformation.businessAddress.line2,
      business_address_city: requestData.businessInformation.businessAddress.city,
      business_address_state: requestData.businessInformation.businessAddress.state,
      business_address_zip_code: requestData.businessInformation.businessAddress.zipCode,
      business_address_country: requestData.businessInformation.businessAddress.country,
      
      // Owner Information
      owner_first_name: requestData.ownerInformation.firstName,
      owner_last_name: requestData.ownerInformation.lastName,
      owner_job_title: requestData.ownerInformation.jobTitle,
      owner_work_email: requestData.ownerInformation.workEmail,
      owner_personal_phone: requestData.ownerInformation.personalPhone,
      owner_personal_address_line1: requestData.ownerInformation.personalAddress.line1,
      owner_personal_address_line2: requestData.ownerInformation.personalAddress.line2,
      owner_personal_address_city: requestData.ownerInformation.personalAddress.city,
      owner_personal_address_state: requestData.ownerInformation.personalAddress.state,
      owner_personal_address_zip_code: requestData.ownerInformation.personalAddress.zipCode,
      owner_personal_address_country: requestData.ownerInformation.personalAddress.country,
      owner_date_of_birth: requestData.ownerInformation.dateOfBirth || null,
      owner_personal_tax_id: requestData.ownerInformation.personalTaxId || null,
      owner_ownership_percentage: requestData.ownerInformation.ownershipPercentage || null,
      
      // Processing Information
      annual_ach_volume: requestData.processingInformation.annualAchVolume,
      annual_card_volume: requestData.processingInformation.annualCardVolume,
      average_ach_amount: requestData.processingInformation.averageAchAmount,
      average_card_amount: requestData.processingInformation.averageCardAmount,
      max_ach_amount: requestData.processingInformation.maxAchAmount,
      max_card_amount: requestData.processingInformation.maxCardAmount,
      card_present_percentage: requestData.processingInformation.cardVolumeDistribution.cardPresent,
      moto_percentage: requestData.processingInformation.cardVolumeDistribution.moto,
      ecommerce_percentage: requestData.processingInformation.cardVolumeDistribution.ecommerce,
      b2b_percentage: requestData.processingInformation.businessVolumeDistribution.b2b,
      b2c_percentage: requestData.processingInformation.businessVolumeDistribution.b2c,
      p2p_percentage: requestData.processingInformation.businessVolumeDistribution.p2p,
      mcc_code: requestData.processingInformation.mccCode,
      statement_descriptor: requestData.processingInformation.statementDescriptor,
      has_accepted_cards_previously: requestData.processingInformation.hasAcceptedCardsPreviously,
      refund_policy: requestData.processingInformation.refundPolicy,
      
      // Legal Agreements
      merchant_agreement_accepted: requestData.processingInformation.merchantAgreementAccepted,
      merchant_agreement_ip_address: requestData.processingInformation.merchantAgreementMetadata.ipAddress,
      merchant_agreement_timestamp: requestData.processingInformation.merchantAgreementMetadata.timestamp,
      merchant_agreement_user_agent: requestData.processingInformation.merchantAgreementMetadata.userAgent,
      credit_check_consent: requestData.processingInformation.creditCheckConsent || false,
      credit_check_ip_address: requestData.processingInformation.creditCheckMetadata?.ipAddress || null,
      credit_check_timestamp: requestData.processingInformation.creditCheckMetadata?.timestamp || null,
      credit_check_user_agent: requestData.processingInformation.creditCheckMetadata?.userAgent || null,
      
      // Finix Response Storage
      finix_raw_response: finixResult,
      finix_entity_data: finixResult.entity || null,
      finix_tags: finixResult.tags || null,
      submission_metadata: {
        submitted_at: new Date().toISOString(),
        api_version: '2018-01-01',
        environment: finixEnvironment
      },
      processing_status: 'submitted'
    };

    const { data: customerRecord, error: dbError } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (dbError) {
      console.error('Database Error:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error', 
          details: dbError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        sellerId: finixIdentityId,
        applicationId: finixResult.application?.id || null,
        verificationStatus: finixResult.verification?.status || 'pending',
        customerRecord,
        finixResponse: finixResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});