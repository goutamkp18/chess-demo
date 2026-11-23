-- =====================================================================
-- CHESS MAGIC - USER PROFILES & AUTH SCHEMA FOR SUPABASE
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eekzwxitffjfnjzlmvwn/sql
-- =====================================================================

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
  player_id INT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
  approval_note VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for instant username lookups & login resolution
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DROP POLICY IF EXISTS "Public Read User Profiles" ON public.user_profiles;
CREATE POLICY "Public Read User Profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users Insert Own Profile" ON public.user_profiles;
CREATE POLICY "Users Insert Own Profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users Update Own Profile" ON public.user_profiles;
CREATE POLICY "Users Update Own Profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
