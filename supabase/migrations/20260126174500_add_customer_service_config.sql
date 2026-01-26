-- Create customer_service_config table
-- This table stores per-customer service enablement settings and merchant assignments

CREATE TABLE IF NOT EXISTS customer_service_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  
  -- Service Toggles (default to true for backward compatibility)
  building_permits_enabled boolean DEFAULT true,
  business_licenses_enabled boolean DEFAULT true,
  taxes_enabled boolean DEFAULT true,
  sport_reservations_enabled boolean DEFAULT true,
  other_services_enabled boolean DEFAULT true,
  
  -- Merchant Assignments for services that need explicit merchant linking
  building_permits_merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  business_licenses_merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(customer_id)
);

-- Create index for fast lookups by customer_id
CREATE INDEX IF NOT EXISTS idx_customer_service_config_customer_id 
  ON customer_service_config(customer_id);

-- Enable RLS
ALTER TABLE customer_service_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SuperAdmins can do everything
CREATE POLICY "SuperAdmins can manage all customer service configs"
  ON customer_service_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'superadmin'
    )
  );

-- RLS Policy: Municipal admins can read their own customer's config
CREATE POLICY "Municipal admins can read their customer service config"
  ON customer_service_config
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT profiles.customer_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type IN ('municipaladmin', 'municipal')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_service_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_service_config_updated_at
  BEFORE UPDATE ON customer_service_config
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_service_config_updated_at();

-- Insert default config for all existing customers (all services enabled)
INSERT INTO customer_service_config (customer_id)
SELECT customer_id FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM customer_service_config)
ON CONFLICT (customer_id) DO NOTHING;
