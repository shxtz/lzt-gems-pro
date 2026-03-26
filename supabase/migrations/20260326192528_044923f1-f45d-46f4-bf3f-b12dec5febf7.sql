
-- Fix: drop and recreate view to remove columns
DROP VIEW IF EXISTS public.lzt_categories_public;
CREATE VIEW public.lzt_categories_public
WITH (security_invoker = on) AS
  SELECT id, name, icon_url, sort_order, created_at, updated_at
  FROM public.lzt_categories;

GRANT SELECT ON public.lzt_categories_public TO anon, authenticated;

-- Also restrict lzt_accounts to authenticated users
DROP POLICY IF EXISTS "Anyone can view available accounts" ON public.lzt_accounts;
CREATE POLICY "Authenticated can view available accounts" ON public.lzt_accounts
  FOR SELECT TO anon, authenticated
  USING (status = 'available');
