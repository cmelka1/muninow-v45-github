
import { FinixIdentityParams } from './types/finix.ts';

// Map business type to Finix-compatible enum
export const mapBusinessType = (entityType: string): string => {
  const mappings: Record<string, string> = {
    'Corporation': 'CORPORATION',
    'LLC': 'LIMITED_LIABILITY_COMPANY',
    'Limited Liability Company': 'LIMITED_LIABILITY_COMPANY', 
    'Partnership': 'PARTNERSHIP',
    'Limited Partnership': 'LIMITED_PARTNERSHIP',
    'General Partnership': 'GENERAL_PARTNERSHIP',
    'Sole Proprietorship': 'INDIVIDUAL_SOLE_PROPRIETORSHIP',
    'Individual Sole Proprietorship': 'INDIVIDUAL_SOLE_PROPRIETORSHIP',
    'Association Estate Trust': 'ASSOCIATION_ESTATE_TRUST',
    'Tax Exempt Organization': 'TAX_EXEMPT_ORGANIZATION',
    'International Organization': 'INTERNATIONAL_ORGANIZATION',
    'Government Agency': 'GOVERNMENT_AGENCY',
    'Joint Venture': 'JOINT_VENTURE',
    'LLC Disregarded': 'LLC_DISREGARDED'
  };
  
  const mapped = mappings[entityType] || mappings[entityType.toUpperCase()];
  if (!mapped) {
    console.warn(`Unmapped business type: ${entityType}. Using CORPORATION as fallback.`);
    return 'CORPORATION';
  }
  
  return mapped;
};

// Map bank account type to Finix format
export const mapBankAccountType = (type: string): string => {
  const mappings: Record<string, string> = {
    'business_checking': 'CHECKING',
    'business_savings': 'SAVINGS',
    'personal_checking': 'CHECKING',
    'personal_savings': 'SAVINGS'
  };
  return mappings[type] || 'CHECKING';
};

// Format dates for Finix API
export const formatFinixDate = (dateJson: any) => {
  if (!dateJson) return null;
  // Handle both object {year, month, day} and potential ISO strings if data source changes
  if (typeof dateJson === 'string') {
      const d = new Date(dateJson);
      return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate()
      };
  }
  
  // Assuming inputs are 1-based months if they come from our specific UI date picker, 
  // but standard JS Date is 0-based. 
  // The existing code was: new Date(dateJson.year, dateJson.month - 1, dateJson.day)
  // which implies dateJson.month is 1-based.
  const date = new Date(dateJson.year, dateJson.month - 1, dateJson.day);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
};

export const createFinixIdentityPayload = (
    customer: any, 
    merchantName: string, 
    statementDescriptor: string
): FinixIdentityParams => {
    
  const incorporationDate = formatFinixDate(customer.incorporation_date);
  const dateOfBirth = formatFinixDate(customer.date_of_birth);
  const mappedBusinessType = mapBusinessType(customer.entity_type);

  return {
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
        line2: customer.business_address_line2 || undefined, // undefined vs null for optional in strict TS
        line1: customer.business_address_line1,
        postal_code: customer.business_zip_code
      },
      business_name: customer.legal_entity_name,
      business_phone: customer.entity_phone,
      business_tax_id: customer.tax_id,
      business_type: mappedBusinessType,
      default_statement_descriptor: statement_descriptor,
      dob: dateOfBirth,
      doing_business_as: customer.doing_business_as,
      email: customer.work_email,
      first_name: customer.first_name,
      has_accepted_credit_cards_previously: customer.has_accepted_cards_previously || false,
      incorporation_date: incorporationDate,
      last_name: customer.last_name,
      max_transaction_amount: customer.max_card_amount || 999900,
      ach_max_transaction_amount: customer.max_ach_amount || 999900,
      mcc: customer.mcc_code,
      ownership_type: customer.ownership_type?.toUpperCase(),
      personal_address: {
        city: customer.personal_city,
        country: customer.personal_country || "USA",
        region: customer.personal_state,
        line2: customer.personal_address_line2 || undefined,
        line1: customer.personal_address_line1,
        postal_code: customer.personal_zip_code
      },
      phone: customer.personal_phone,
      principal_percentage_ownership: customer.ownership_percentage || 100,
      tax_id: customer.personal_tax_id || customer.tax_id,
      title: customer.job_title,
      url: customer.entity_website || undefined
    },
    identity_roles: ["SELLER"],
    tags: {
      "Merchant Name": merchantName,
      "Customer ID": customer.customer_id
    },
    type: "BUSINESS"
  };
}
