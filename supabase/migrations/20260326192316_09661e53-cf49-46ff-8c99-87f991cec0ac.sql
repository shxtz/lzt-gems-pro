
-- Re-add public read for lzt_categories (needed by Shop/AccountPreview)
-- The api_url column is visible but non-sensitive for display purposes
-- The real protection is that edge functions use service_role for actual API calls
CREATE POLICY "Public can read lzt_categories" ON public.lzt_categories
  FOR SELECT TO public
  USING (true);
