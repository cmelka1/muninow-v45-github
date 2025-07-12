-- Add customer_id to profiles table for municipal users
ALTER TABLE public.profiles 
ADD COLUMN customer_id UUID REFERENCES public.customers(customer_id);

-- Create partial unique index for customer_id (only one municipal admin per customer)
CREATE UNIQUE INDEX unique_municipal_customer_admin 
ON public.profiles (customer_id) 
WHERE account_type = 'municipal';

-- Create function to check if customer already has an admin
CREATE OR REPLACE FUNCTION public.check_customer_admin_exists(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE customer_id = p_customer_id 
    AND account_type = 'municipal'
  );
END;
$$;

-- Create municipal_team_members table for future invited users
CREATE TABLE public.municipal_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(customer_id),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, member_id)
);

-- Enable RLS on municipal_team_members
ALTER TABLE public.municipal_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for municipal_team_members
CREATE POLICY "Municipal admins can manage team members" 
ON public.municipal_team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = municipal_team_members.customer_id
  )
);

CREATE POLICY "Municipal members can view their team" 
ON public.municipal_team_members 
FOR SELECT 
USING (
  member_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = municipal_team_members.customer_id
  )
);

-- Update master_bills RLS to allow municipal users to access bills for their customer's merchants
CREATE POLICY "Municipal users can view bills for their customer's merchants" 
ON public.master_bills 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.merchants m ON m.customer_id = p.customer_id
    WHERE p.id = auth.uid() 
    AND p.account_type = 'municipal'
    AND m.id = master_bills.merchant_id
  )
);

-- Update merchants RLS to allow municipal users to access merchants under their customer
CREATE POLICY "Municipal users can view merchants under their customer" 
ON public.merchants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = merchants.customer_id
  )
);

-- Add trigger for updated_at on municipal_team_members
CREATE TRIGGER update_municipal_team_members_updated_at
  BEFORE UPDATE ON public.municipal_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();