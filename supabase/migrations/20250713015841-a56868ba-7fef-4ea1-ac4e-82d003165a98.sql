-- Disable Row Level Security for system tables to allow triggers and functions to insert data
ALTER TABLE public.bill_matching_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_processing_failures DISABLE ROW LEVEL SECURITY;