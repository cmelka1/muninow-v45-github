-- Fix search path for calculate_unified_service_fee function
CREATE OR REPLACE FUNCTION public.calculate_unified_service_fee(
  p_base_amount_cents bigint,
  p_is_card boolean,
  p_merchant_id uuid
)
RETURNS TABLE(service_fee_cents bigint, total_amount_cents bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_profile record;
  v_service_fee_percentage_cents bigint := 0;
  v_service_fee_fixed_cents bigint := 0;
  v_total_service_fee_cents bigint := 0;
  v_basis_points integer;
  v_fixed_fee integer;
BEGIN
  -- Get fee profile for merchant
  SELECT 
    basis_points, 
    fixed_fee, 
    ach_basis_points, 
    ach_fixed_fee,
    ach_basis_points_fee_limit
  INTO v_fee_profile
  FROM public.merchant_fee_profiles
  WHERE merchant_id = p_merchant_id;
  
  -- Use defaults if no fee profile found
  IF v_fee_profile IS NULL THEN
    v_basis_points := CASE WHEN p_is_card THEN 300 ELSE 150 END;
    v_fixed_fee := 50;
  ELSE
    -- Select appropriate fee structure based on payment method
    IF p_is_card THEN
      v_basis_points := COALESCE(v_fee_profile.basis_points, 300);
      v_fixed_fee := COALESCE(v_fee_profile.fixed_fee, 50);
    ELSE
      v_basis_points := COALESCE(v_fee_profile.ach_basis_points, 150);
      v_fixed_fee := COALESCE(v_fee_profile.ach_fixed_fee, 50);
    END IF;
  END IF;
  
  -- Calculate percentage fee: (Base Amount × Fee Percentage)
  v_service_fee_percentage_cents := ROUND((p_base_amount_cents * v_basis_points) / 10000.0);
  
  -- Apply ACH basis points fee limit if applicable
  IF NOT p_is_card AND v_fee_profile.ach_basis_points_fee_limit IS NOT NULL 
     AND v_service_fee_percentage_cents > v_fee_profile.ach_basis_points_fee_limit THEN
    v_service_fee_percentage_cents := v_fee_profile.ach_basis_points_fee_limit;
  END IF;
  
  -- Calculate total service fee: Percentage Fee + Fixed Fee
  v_service_fee_fixed_cents := v_fixed_fee;
  v_total_service_fee_cents := v_service_fee_percentage_cents + v_service_fee_fixed_cents;
  
  -- Return the calculated fees
  RETURN QUERY SELECT v_total_service_fee_cents, p_base_amount_cents + v_total_service_fee_cents;
END;
$$;