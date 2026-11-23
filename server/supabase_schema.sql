-- =====================================================================
-- CHESS ARENA - SUPABASE DATABASE SCHEMA
-- Execute this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =====================================================================

-- 1. Enable UUID Extension (standard in Postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ARENA_ROOMS: Stores matchmaking rooms and credentials
CREATE TABLE IF NOT EXISTS public.arena_rooms (
  room_id VARCHAR(64) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  time_control JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING_FOR_OPPONENT',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast status & lookup queries
CREATE INDEX IF NOT EXISTS idx_arena_rooms_status ON public.arena_rooms (status);
CREATE INDEX IF NOT EXISTS idx_arena_rooms_created_at ON public.arena_rooms (created_at DESC);

-- 3. ARENA_MATCHES: Stores official game results, moves, FEN positions & PGNs
CREATE TABLE IF NOT EXISTS public.arena_matches (
  match_id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  white_player JSONB NOT NULL,
  black_player JSONB,
  status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
  winner VARCHAR(16),
  reason VARCHAR(64),
  start_time BIGINT,
  end_time BIGINT,
  moves JSONB NOT NULL DEFAULT '[]'::jsonb,
  pgn TEXT NOT NULL DEFAULT '',
  fen TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching matches by room
CREATE INDEX IF NOT EXISTS idx_arena_matches_room_id ON public.arena_matches (room_id);
CREATE INDEX IF NOT EXISTS idx_arena_matches_created_at ON public.arena_matches (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.arena_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_matches ENABLE ROW LEVEL SECURITY;

-- 5. Policies: Allow read access to all clients; allow insert/update from service role or authenticated backend
DROP POLICY IF EXISTS "Public Read Arena Rooms" ON public.arena_rooms;
CREATE POLICY "Public Read Arena Rooms"
  ON public.arena_rooms
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public Modify Arena Rooms" ON public.arena_rooms;
CREATE POLICY "Public Modify Arena Rooms"
  ON public.arena_rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Arena Matches" ON public.arena_matches;
CREATE POLICY "Public Read Arena Matches"
  ON public.arena_matches
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public Modify Arena Matches" ON public.arena_matches;
CREATE POLICY "Public Modify Arena Matches"
  ON public.arena_matches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Enable Supabase Realtime (Optional: allows live frontend listeners and spectator dashboards)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_matches;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
