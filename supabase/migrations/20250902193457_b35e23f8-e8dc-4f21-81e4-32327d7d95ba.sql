-- Create standardized payment type enum
CREATE TYPE payment_type_enum AS ENUM ('PAYMENT_CARD', 'BANK_ACCOUNT', 'APPLE_PAY', 'GOOGLE_PAY');

-- Add payment_type column to tables missing it
ALTER TABLE public.municipal_service_applications 
ADD COLUMN payment_type payment_type_enum;

ALTER TABLE public.permit_applications 
ADD COLUMN payment_type payment_type_enum;

-- Standardize existing payment_history values to canonical format
UPDATE public.payment_history 
SET payment_type = CASE 
  WHEN payment_type IN ('CARD', 'Card', 'card', 'credit_card', 'CREDIT_CARD') THEN 'PAYMENT_CARD'
  WHEN payment_type IN ('ACH', 'ach', 'bank_account', 'BANK_ACCOUNT') THEN 'BANK_ACCOUNT'
  WHEN payment_type IN ('APPLE_PAY', 'apple_pay') THEN 'APPLE_PAY'
  WHEN payment_type IN ('GOOGLE_PAY', 'google_pay') THEN 'GOOGLE_PAY'
  ELSE payment_type
END
WHERE payment_type IS NOT NULL;

-- Populate payment_type from payment_method_type where missing
UPDATE public.business_license_applications 
SET payment_type = CASE 
  WHEN payment_method_type IN ('CARD', 'Card', 'card', 'credit_card', 'CREDIT_CARD') THEN 'PAYMENT_CARD'::payment_type_enum
  WHEN payment_method_type IN ('ACH', 'ach', 'bank_account', 'BANK_ACCOUNT') THEN 'BANK_ACCOUNT'::payment_type_enum
  WHEN payment_method_type IN ('APPLE_PAY', 'apple_pay') THEN 'APPLE_PAY'::payment_type_enum
  WHEN payment_method_type IN ('GOOGLE_PAY', 'google_pay') THEN 'GOOGLE_PAY'::payment_type_enum
  ELSE NULL
END
WHERE payment_type IS NULL AND payment_method_type IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.municipal_service_applications.payment_type IS 'Standardized payment type: PAYMENT_CARD, BANK_ACCOUNT, APPLE_PAY, or GOOGLE_PAY';
COMMENT ON COLUMN public.permit_applications.payment_type IS 'Standardized payment type: PAYMENT_CARD, BANK_ACCOUNT, APPLE_PAY, or GOOGLE_PAY';