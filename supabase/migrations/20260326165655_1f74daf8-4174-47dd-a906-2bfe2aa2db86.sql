ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_e2eid text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lzt_reserved_credentials jsonb;