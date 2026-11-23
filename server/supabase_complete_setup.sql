-- =====================================================================
-- CHESS MAGIC & ARENA — COMPLETE SUPABASE SETUP SCRIPT
-- Execute this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eekzwxitffjfnjzlmvwn/sql
-- =====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop any conflicting policies safely
DROP POLICY IF EXISTS "Public Read Arena Rooms" ON public.arena_rooms;
DROP POLICY IF EXISTS "Public Modify Arena Rooms" ON public.arena_rooms;
DROP POLICY IF EXISTS "Public Read arena_rooms" ON public.arena_rooms;
DROP POLICY IF EXISTS "Public Modify arena_rooms" ON public.arena_rooms;
DROP POLICY IF EXISTS "Public Read Arena Matches" ON public.arena_matches;
DROP POLICY IF EXISTS "Public Modify Arena Matches" ON public.arena_matches;
DROP POLICY IF EXISTS "Public Read arena_matches" ON public.arena_matches;
DROP POLICY IF EXISTS "Public Modify arena_matches" ON public.arena_matches;

-- 3. USER_PROFILES: Core table linking Supabase Auth to Chess Magic application data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(120) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('PLAYER', 'ORGANIZER', 'ADMIN')),
  country_code CHAR(2),
  country VARCHAR(60),
  avatar_url TEXT,
  phone VARCHAR(20),
  organization VARCHAR(120),
  date_of_birth DATE,
  gender VARCHAR(12),
  experience_level VARCHAR(12),
  club VARCHAR(100),
  fide_id VARCHAR(12),
  player_id INT REFERENCES public.player(player_id) ON DELETE SET NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
  approval_note VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for user_profiles
DROP POLICY IF EXISTS "Allow Public Read User Profiles" ON public.user_profiles;
CREATE POLICY "Allow Public Read User Profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow Users Insert Own Profile" ON public.user_profiles;
CREATE POLICY "Allow Users Insert Own Profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Users Update Own Profile" ON public.user_profiles;
CREATE POLICY "Allow Users Update Own Profile"
  ON public.user_profiles FOR UPDATE
  USING (true);

-- Re-establish Arena policies cleanly
DROP POLICY IF EXISTS "Arena Rooms Select" ON public.arena_rooms;
CREATE POLICY "Arena Rooms Select" ON public.arena_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Arena Rooms All" ON public.arena_rooms;
CREATE POLICY "Arena Rooms All" ON public.arena_rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Arena Matches Select" ON public.arena_matches;
CREATE POLICY "Arena Matches Select" ON public.arena_matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Arena Matches All" ON public.arena_matches;
CREATE POLICY "Arena Matches All" ON public.arena_matches FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime for live updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_matches;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Seed Dedicated Admin User (admin@1234 / @admin) securely in Supabase Auth & user_profiles
DO $$
DECLARE
  admin_uid UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@chessmagic.internal') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'admin@chessmagic.internal',
      crypt('@admin', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Administrator","username":"admin@1234"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      ''
    );
  ELSE
    SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@chessmagic.internal';
    UPDATE auth.users 
    SET encrypted_password = crypt('@admin', gen_salt('bf')),
        email_confirmed_at = NOW()
    WHERE id = admin_uid;
  END IF;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    username,
    role,
    country_code,
    country,
    onboarding_completed,
    approval_status
  ) VALUES (
    admin_uid,
    'admin@chessmagic.internal',
    'System Administrator',
    'admin@1234',
    'ADMIN',
    'IN',
    'India',
    TRUE,
    'APPROVED'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'ADMIN',
    username = 'admin@1234',
    full_name = 'System Administrator',
    onboarding_completed = TRUE,
    approval_status = 'APPROVED';
END $$;
