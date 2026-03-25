
-- Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_id text,
  ADD COLUMN IF NOT EXISTS restorecord_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  ip_address text NOT NULL DEFAULT 'unknown',
  user_agent text DEFAULT 'unknown',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login_attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert login_attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);
