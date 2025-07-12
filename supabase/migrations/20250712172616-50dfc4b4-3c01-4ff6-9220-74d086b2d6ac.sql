-- Add Merchant Information columns to payment_history
ALTER TABLE public.payment_history ADD COLUMN merchant_name text;
ALTER TABLE public.payment_history ADD COLUMN category text;
ALTER TABLE public.payment_history ADD COLUMN subcategory text;
ALTER TABLE public.payment_history ADD COLUMN doing_business_as text;
ALTER TABLE public.payment_history ADD COLUMN statement_descriptor text;

-- Add Bill Identification & External Data columns
ALTER TABLE public.payment_history ADD COLUMN external_bill_number text;
ALTER TABLE public.payment_history ADD COLUMN external_account_number text;
ALTER TABLE public.payment_history ADD COLUMN data_source_system text;
ALTER TABLE public.payment_history ADD COLUMN external_business_name text;
ALTER TABLE public.payment_history ADD COLUMN external_customer_name text;
ALTER TABLE public.payment_history ADD COLUMN external_customer_address_line1 text;
ALTER TABLE public.payment_history ADD COLUMN external_customer_city text;
ALTER TABLE public.payment_history ADD COLUMN external_customer_state text;
ALTER TABLE public.payment_history ADD COLUMN external_customer_zip_code text;

-- Add Customer Information columns
ALTER TABLE public.payment_history ADD COLUMN customer_first_name text;
ALTER TABLE public.payment_history ADD COLUMN customer_last_name text;
ALTER TABLE public.payment_history ADD COLUMN customer_email text;
ALTER TABLE public.payment_history ADD COLUMN customer_street_address text;
ALTER TABLE public.payment_history ADD COLUMN customer_apt_number text;
ALTER TABLE public.payment_history ADD COLUMN customer_city text;
ALTER TABLE public.payment_history ADD COLUMN customer_state text;
ALTER TABLE public.payment_history ADD COLUMN customer_zip_code text;

-- Add Business Legal Information
ALTER TABLE public.payment_history ADD COLUMN business_legal_name text;
ALTER TABLE public.payment_history ADD COLUMN business_address_line1 text;
ALTER TABLE public.payment_history ADD COLUMN business_city text;
ALTER TABLE public.payment_history ADD COLUMN business_state text;
ALTER TABLE public.payment_history ADD COLUMN business_zip_code text;
ALTER TABLE public.payment_history ADD COLUMN entity_type text;

-- Add Key Bill Details
ALTER TABLE public.payment_history ADD COLUMN bill_type text;
ALTER TABLE public.payment_history ADD COLUMN issue_date timestamp with time zone;
ALTER TABLE public.payment_history ADD COLUMN due_date timestamp with time zone;
ALTER TABLE public.payment_history ADD COLUMN original_amount_cents bigint;
ALTER TABLE public.payment_history ADD COLUMN payment_status text;
ALTER TABLE public.payment_history ADD COLUMN bill_status text;