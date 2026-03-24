
-- LZT Categories table
CREATE TABLE public.lzt_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_url text,
  api_url text NOT NULL DEFAULT '',
  margin_percent integer NOT NULL DEFAULT 30,
  auto_import boolean NOT NULL DEFAULT false,
  auto_delete_reimport boolean NOT NULL DEFAULT false,
  account_limit integer NOT NULL DEFAULT 300,
  last_import_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sort_order integer DEFAULT 0
);

ALTER TABLE public.lzt_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lzt_categories" ON public.lzt_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read lzt_categories" ON public.lzt_categories
  FOR SELECT TO public
  USING (true);

-- LZT Accounts table
CREATE TABLE public.lzt_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.lzt_categories(id) ON DELETE CASCADE NOT NULL,
  lzt_item_id text NOT NULL,
  title text,
  price_usd numeric NOT NULL DEFAULT 0,
  price_brl numeric NOT NULL DEFAULT 0,
  sold_price numeric,
  data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'available',
  imported_at timestamptz NOT NULL DEFAULT now(),
  sold_at timestamptz,
  buyer_id uuid,
  UNIQUE(lzt_item_id)
);

ALTER TABLE public.lzt_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lzt_accounts" ON public.lzt_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view available accounts" ON public.lzt_accounts
  FOR SELECT TO public
  USING (status = 'available');

-- Trigger for updated_at on categories
CREATE TRIGGER update_lzt_categories_updated_at
  BEFORE UPDATE ON public.lzt_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
