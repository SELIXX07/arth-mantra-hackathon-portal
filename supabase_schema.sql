-- Drop tables if re-initializing
DROP TABLE IF EXISTS public.team_registrations CASCADE;
DROP TABLE IF EXISTS public.hackathons CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  srn TEXT,
  department TEXT,
  semester TEXT,
  section TEXT,
  residence_type TEXT DEFAULT 'Non-Hostelite',
  role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'superadmin')),
  must_reset_password BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration helpers if table already exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residence_type TEXT DEFAULT 'Non-Hostelite';

-- Hackathons table
CREATE TABLE public.hackathons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 500,
  max_teams INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  poster_url TEXT,
  upi_id TEXT,
  qr_code_url TEXT,
  whatsapp_link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  show_registered_teams BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hackathons ADD COLUMN IF NOT EXISTS show_registered_teams BOOLEAN DEFAULT TRUE;

-- Team Registrations table
CREATE TABLE IF NOT EXISTS public.team_registrations (
  id TEXT PRIMARY KEY,
  hackathon_id TEXT NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  hackathon_name TEXT NOT NULL,
  leader_user_id TEXT NOT NULL,
  leader_email TEXT NOT NULL,
  team_name TEXT NOT NULL,
  members JSONB NOT NULL DEFAULT '[]',
  payment_screenshot_url TEXT NOT NULL,
  utr_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_comment TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  round_1_score INTEGER DEFAULT 0,
  round_2_score INTEGER DEFAULT 0,
  round_3_score INTEGER DEFAULT 0,
  round_4_score INTEGER DEFAULT 0,
  round_5_score INTEGER DEFAULT 0,
  round_6_score INTEGER DEFAULT 0,
  ic_starting INTEGER DEFAULT 10000,
  ic_stock_trades INTEGER DEFAULT 0,
  ic_auction_spent INTEGER DEFAULT 0,
  ic_r5_wager INTEGER DEFAULT 0,
  ic_r5_result TEXT DEFAULT 'none',
  ic_balance INTEGER DEFAULT 10000,
  brownie_points INTEGER DEFAULT 0,
  judge_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure score & IC columns exist on existing deployments
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS round_1_score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS round_2_score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS round_3_score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS round_4_score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS round_5_score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS round_6_score INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS ic_starting INTEGER DEFAULT 10000;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS ic_stock_trades INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS ic_auction_spent INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS ic_r5_wager INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS ic_r5_result TEXT DEFAULT 'none';
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS ic_balance INTEGER DEFAULT 10000;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS brownie_points INTEGER DEFAULT 0;
ALTER TABLE public.team_registrations ADD COLUMN IF NOT EXISTS judge_notes TEXT;

-- Admin Users table
CREATE TABLE public.admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  added_by TEXT NOT NULL,
  first_login_pending BOOLEAN DEFAULT FALSE,
  temporary_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Dev / Superadmin
INSERT INTO public.admin_users (id, email, name, role, added_by, temporary_password, first_login_pending)
VALUES ('admin-dev', 'artharambachalil@gmail.com', 'Arth', 'superadmin', 'system', NULL, FALSE)
ON CONFLICT (email) DO UPDATE SET role = 'superadmin', temporary_password = NULL;

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insertable on signup" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (true);

-- Hackathons policies
CREATE POLICY "Hackathons viewable by all" ON public.hackathons FOR SELECT USING (true);
CREATE POLICY "Admins can insert hackathons" ON public.hackathons FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update hackathons" ON public.hackathons FOR UPDATE USING (true);
CREATE POLICY "Admins can delete hackathons" ON public.hackathons FOR DELETE USING (true);

-- Team registrations policies
CREATE POLICY "Registrations viewable" ON public.team_registrations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert registration" ON public.team_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update registration" ON public.team_registrations FOR UPDATE USING (true);
CREATE POLICY "Admins can delete registration" ON public.team_registrations FOR DELETE USING (true);

-- Admin users policies
CREATE POLICY "Admin users viewable" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admins can insert admins" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update admins" ON public.admin_users FOR UPDATE USING (true);
CREATE POLICY "Admins can delete admins" ON public.admin_users FOR DELETE USING (true);

-- Storage bucket for payment screenshots and assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies
DROP POLICY IF EXISTS "Public Screenshot Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Screenshot Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Screenshot Delete" ON storage.objects;

CREATE POLICY "Public Screenshot Access" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots');
CREATE POLICY "Public Screenshot Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');
CREATE POLICY "Public Screenshot Delete" ON storage.objects FOR DELETE USING (bucket_id = 'payment-screenshots');

-- NOTE: After running this schema:
-- 1. Go to Supabase Storage and create a bucket named "payment-screenshots" (public)
-- 2. Dev account is artharambachalil@gmail.com
-- 3. Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local
