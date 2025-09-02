-- Add missing foreign key constraint between municipal_service_applications and customers
ALTER TABLE municipal_service_applications 
ADD CONSTRAINT municipal_service_applications_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(customer_id);