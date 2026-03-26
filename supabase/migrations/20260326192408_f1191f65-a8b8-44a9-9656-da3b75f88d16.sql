
-- 1. Remove the permissive lzt_categories policy - use view instead
DROP POLICY IF EXISTS "Public can read lzt_categories" ON public.lzt_categories;

-- 2. Grant public SELECT on the view
GRANT SELECT ON public.lzt_categories_public TO anon, authenticated;

-- 3. Fix user_roles: add explicit restrictive INSERT policy for non-admins
CREATE POLICY "Non-admins cannot insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix coupons: create an RPC function for coupon validation instead of direct SELECT
CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code text)
RETURNS TABLE(id uuid, discount_percent integer, code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT c.id, c.discount_percent, c.code
  FROM public.coupons c
  WHERE c.code = upper(coupon_code)
    AND c.active = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
  LIMIT 1;
$$;

-- 5. Restrict coupons SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can read active coupons" ON public.coupons;
CREATE POLICY "Only admins can read coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
