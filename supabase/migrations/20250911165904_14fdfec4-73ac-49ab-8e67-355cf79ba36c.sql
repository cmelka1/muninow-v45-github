-- Update get_municipal_questions function to show inactive questions
CREATE OR REPLACE FUNCTION public.get_municipal_questions(p_customer_id uuid, p_merchant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, customer_id uuid, merchant_id uuid, merchant_name text, question_text text, question_type text, question_options jsonb, is_required boolean, display_order integer, is_active boolean, help_text text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    mpq.id,
    mpq.customer_id,
    mpq.merchant_id,
    mpq.merchant_name,
    mpq.question_text,
    mpq.question_type,
    mpq.question_options,
    mpq.is_required,
    mpq.display_order,
    mpq.is_active,
    mpq.help_text,
    mpq.created_at,
    mpq.updated_at
  FROM public.municipal_permit_questions mpq
  WHERE mpq.customer_id = p_customer_id
    AND (
      p_merchant_id IS NULL AND mpq.merchant_id IS NULL
      OR mpq.merchant_id = p_merchant_id
      OR mpq.merchant_id IS NULL
    )
  ORDER BY mpq.display_order;
END;
$function$