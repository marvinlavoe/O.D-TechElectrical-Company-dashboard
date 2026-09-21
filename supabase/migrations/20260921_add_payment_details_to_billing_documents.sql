-- Migration: Add payment_details to billing_documents
ALTER TABLE public.billing_documents 
ADD COLUMN IF NOT EXISTS payment_details TEXT;
