CREATE TABLE public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  emoji text DEFAULT '',
  icon_url text,
  sort_order integer DEFAULT 0,
  visible boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible categories"
  ON public.shop_categories FOR SELECT
  TO public
  USING (visible = true);

CREATE POLICY "Admins can manage categories"
  ON public.shop_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shop_categories_updated_at
  BEFORE UPDATE ON public.shop_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();