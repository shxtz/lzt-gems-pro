ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_client_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_client_doc text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_institution text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_bank_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;