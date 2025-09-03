-- Final cleanup: Delete municipal team members for Hinsdale customer
DELETE FROM public.municipal_team_members 
WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687';

-- Now we can safely delete the Hinsdale customer record
DELETE FROM public.customers 
WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687';