import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Load Finix secrets
    const FINIX_APPLICATION_ID = Deno.env.get("FINIX_APPLICATION_ID")!
    const FINIX_API_SECRET = Deno.env.get("FINIX_API_SECRET")!
    const FINIX_ENVIRONMENT = Deno.env.get("FINIX_ENVIRONMENT") || "sandbox"

    const FINIX_BASE_URL = FINIX_ENVIRONMENT === "production"
      ? "https://finixapi.com"
      : "https://finix.sandbox-payments-api.com"

    const FINIX_API_URL = `${FINIX_BASE_URL}/identities`
    const basicAuth = btoa(`${FINIX_APPLICATION_ID}:${FINIX_API_SECRET}`)

    // Construct Finix entity object
    const finixEntity: Record<string, unknown> = {
      business_type: payload.business_type,
      business_name: payload.business_name,
      doing_business_as: payload.doing_business_as || undefined,
      business_tax_id: payload.business_tax_id,
      business_phone: payload.business_phone,
      business_url: payload.business_url || undefined,
      incorporation_date: payload.incorporation_date,
      ownership_type: payload.ownership_type,
      business_address: {
        line1: payload.business_address.line1,
        line2: payload.business_address.line2 || undefined,
        city: payload.business_address.city,
        region: payload.business_address.region,
        postal_code: payload.business_address.postal_code,
        country: payload.business_address.country || "USA",
      },
    }

    // Add principal data if not a government agency
    if (payload.business_type !== "GOVERNMENT_AGENCY" && payload.principal) {
      finixEntity.principal = {
        first_name: payload.principal.first_name,
        last_name: payload.principal.last_name,
        title: payload.principal.title,
        email: payload.principal.email,
        phone: payload.principal.phone,
        date_of_birth: payload.principal.date_of_birth,
        ssn: payload.principal.ssn,
        address: {
          line1: payload.principal.address.line1,
          line2: payload.principal.address.line2 || undefined,
          city: payload.principal.address.city,
          region: payload.principal.address.region,
          postal_code: payload.principal.address.postal_code,
          country: payload.principal.address.country || "USA",
        },
      }
    }

    console.log('Calling Finix API with entity:', JSON.stringify(finixEntity, null, 2))

    // Call Finix API
    const finixRes = await fetch(FINIX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({ entity: finixEntity }),
    })

    const finixData = await finixRes.json()

    if (!finixRes.ok) {
      console.error("Finix API Error:", finixData)
      return new Response(
        JSON.stringify({
          error: "Finix request failed",
          finix_response: finixData,
          submitted_payload: payload,
        }),
        {
          status: finixRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log('Finix API Success:', JSON.stringify(finixData, null, 2))

    // Return comprehensive response for future database integration
    const response = {
      success: true,
      submitted_payload: payload,
      finix_response: finixData,
      processing_metadata: {
        processed_at: new Date().toISOString(),
        finix_environment: FINIX_ENVIRONMENT,
        finix_identity_id: finixData.id,
        verification_status: finixData.entity?.verification?.status || 'pending',
      },
      // Structure data for future customers table
      customer_data: {
        finix_identity_id: finixData.id,
        business_type: payload.business_type,
        business_name: payload.business_name,
        business_tax_id: payload.business_tax_id,
        business_phone: payload.business_phone,
        business_url: payload.business_url,
        doing_business_as: payload.doing_business_as,
        incorporation_date: payload.incorporation_date,
        ownership_type: payload.ownership_type,
        business_address: payload.business_address,
        principal: payload.principal,
        finix_entity_data: finixData.entity,
        verification_status: finixData.entity?.verification?.status || 'pending',
        created_at: new Date().toISOString(),
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  } catch (err) {
    console.error("Unhandled Error:", err)
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: err.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})