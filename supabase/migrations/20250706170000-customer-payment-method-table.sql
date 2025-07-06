-- Create customer_payment_method table to store Finix Payment Instrument data
CREATE TABLE IF NOT EXISTS customer_payment_method (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Finix API Response Fields
    finix_payment_instrument_id TEXT NOT NULL UNIQUE,
    finix_application_id TEXT,
    finix_identity_id TEXT,
    enabled BOOLEAN DEFAULT true,
    instrument_type TEXT NOT NULL, -- e.g., "BANK_ACCOUNT"
    account_type TEXT, -- e.g., "BUSINESS_CHECKING"
    bank_code TEXT, -- routing number
    masked_account_number TEXT,
    account_holder_name TEXT,
    bank_account_validation_check TEXT,
    currency TEXT DEFAULT 'USD',
    country TEXT DEFAULT 'USA',
    fingerprint TEXT,
    
    -- Optional/Nullable Fields
    disabled_code TEXT,
    disabled_message TEXT,
    institution_number TEXT,
    transit_number TEXT,
    third_party TEXT,
    third_party_token TEXT,
    
    -- Metadata Fields
    created_via TEXT DEFAULT 'API',
    tags JSONB DEFAULT '{}',
    links JSONB DEFAULT '{}',
    raw_finix_response JSONB,
    
    -- Internal Fields
    account_nickname TEXT,
    status TEXT DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finix_created_at TIMESTAMP WITH TIME ZONE,
    finix_updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_payment_method_customer_id ON customer_payment_method(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_method_finix_identity_id ON customer_payment_method(finix_identity_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_method_status ON customer_payment_method(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_payment_method_updated_at 
    BEFORE UPDATE ON customer_payment_method 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE customer_payment_method ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admin access (cmelka@muninow.com)
CREATE POLICY "Super admin full access to customer payment methods" ON customer_payment_method
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'cmelka@muninow.com'
        )
    );

-- Customers can view their own payment methods
CREATE POLICY "Customers can view their own payment methods" ON customer_payment_method
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_payment_method.customer_id 
            AND customers.user_id = auth.uid()
        )
    );

-- Insert comments for documentation
COMMENT ON TABLE customer_payment_method IS 'Stores Finix Payment Instrument data for customer bank accounts and payment methods';
COMMENT ON COLUMN customer_payment_method.finix_payment_instrument_id IS 'Unique ID from Finix Payment Instrument API';
COMMENT ON COLUMN customer_payment_method.raw_finix_response IS 'Complete Finix API response for audit trail';
COMMENT ON COLUMN customer_payment_method.account_nickname IS 'Internal nickname for MuniNow purposes';