-- Fix the track_bill_changes function to handle JSONB arrays properly
CREATE OR REPLACE FUNCTION public.track_bill_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  changes JSONB := '{}';
BEGIN
  -- Track important field changes
  IF OLD.amount_due_cents IS DISTINCT FROM NEW.amount_due_cents THEN
    changes := changes || jsonb_build_object('amount_due_cents', 
      jsonb_build_object('from', OLD.amount_due_cents, 'to', NEW.amount_due_cents));
  END IF;
  
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    changes := changes || jsonb_build_object('payment_status', 
      jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status));
  END IF;
  
  IF OLD.bill_status IS DISTINCT FROM NEW.bill_status THEN
    changes := changes || jsonb_build_object('bill_status', 
      jsonb_build_object('from', OLD.bill_status, 'to', NEW.bill_status));
  END IF;

  IF OLD.profile_id IS DISTINCT FROM NEW.profile_id THEN
    changes := changes || jsonb_build_object('profile_id', 
      jsonb_build_object('from', OLD.profile_id, 'to', NEW.profile_id));
  END IF;

  -- Add to change history if changes detected
  IF changes != '{}' THEN
    -- Handle change_history array properly
    IF OLD.change_history IS NULL THEN
      NEW.change_history := ARRAY[jsonb_build_object(
        'timestamp', NOW(),
        'changes', changes,
        'version', COALESCE(NEW.version, 1),
        'trigger', 'system_update'
      )]::JSONB[];
    ELSE
      NEW.change_history := OLD.change_history || 
        ARRAY[jsonb_build_object(
          'timestamp', NOW(),
          'changes', changes,
          'version', COALESCE(NEW.version, 1),
          'trigger', 'system_update'
        )]::JSONB[];
    END IF;
    
    NEW.modification_count := COALESCE(OLD.modification_count, 0) + 1;
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$function$;