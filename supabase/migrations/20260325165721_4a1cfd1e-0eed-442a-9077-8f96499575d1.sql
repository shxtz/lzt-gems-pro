
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product variations (each variation has a credential type and price)
CREATE TABLE public.product_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  credential_type TEXT NOT NULL DEFAULT 'account' CHECK (credential_type IN ('account', 'key')),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock items (individual credentials)
CREATE TABLE public.product_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variation_id UUID NOT NULL REFERENCES public.product_variations(id) ON DELETE CASCADE,
  credential TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sold_at TIMESTAMP WITH TIME ZONE,
  buyer_id UUID,
  order_id UUID
);

-- Delivery logs
CREATE TABLE public.delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID,
  stock_id UUID REFERENCES public.product_stock(id),
  variation_id UUID REFERENCES public.product_variations(id),
  buyer_id UUID,
  credential_delivered TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

-- Products: anyone can read active, admins can manage
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO public USING (active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Variations: anyone can read active, admins can manage
CREATE POLICY "Anyone can view active variations" ON public.product_variations FOR SELECT TO public USING (active = true);
CREATE POLICY "Admins can manage variations" ON public.product_variations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Stock: only admins can see all, users see nothing directly
CREATE POLICY "Admins can manage stock" ON public.product_stock FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Delivery logs: admins see all, users see own
CREATE POLICY "Admins can manage delivery logs" ON public.delivery_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own deliveries" ON public.delivery_logs FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variations_updated_at BEFORE UPDATE ON public.product_variations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
