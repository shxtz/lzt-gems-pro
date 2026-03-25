
INSERT INTO storage.buckets (id, name, public) VALUES ('category-icons', 'category-icons', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view category icons" ON storage.objects FOR SELECT TO public USING (bucket_id = 'category-icons');
CREATE POLICY "Admins can upload category icons" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update category icons" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'category-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete category icons" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'category-icons' AND public.has_role(auth.uid(), 'admin'));
