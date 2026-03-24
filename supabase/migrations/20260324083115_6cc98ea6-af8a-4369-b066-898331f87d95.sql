
-- Create trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed V-Bucks products
INSERT INTO public.vbucks_products (amount, price, original_price, popular, active, sort_order) VALUES
  (1000, 12.90, 17.90, false, true, 1),
  (2800, 29.90, 42.90, true, true, 2),
  (5000, 49.90, 74.90, false, true, 3),
  (13500, 119.90, 179.90, true, true, 4)
ON CONFLICT DO NOTHING;
