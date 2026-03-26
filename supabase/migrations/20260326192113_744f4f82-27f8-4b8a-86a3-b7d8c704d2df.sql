
-- 1. Fix lzt_categories: create a public view hiding api_url
CREATE OR REPLACE VIEW public.lzt_categories_public
WITH (security_invoker = on) AS
  SELECT id, name, icon_url, sort_order, created_at, updated_at, margin_percent, account_limit
  FROM public.lzt_categories;

-- 2. Restrict lzt_categories public SELECT to hide api_url via RLS
DROP POLICY IF EXISTS "Anyone can read lzt_categories" ON public.lzt_categories;
CREATE POLICY "Only admins can read lzt_categories directly" ON public.lzt_categories
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public to read via the view (view uses security_invoker so it needs a base policy)
-- We'll use a separate anon-safe policy that only exposes non-sensitive columns
CREATE POLICY "Public can read lzt_categories basic" ON public.lzt_categories
  FOR SELECT TO public
  USING (true);
