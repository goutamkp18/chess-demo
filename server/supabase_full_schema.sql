-- =====================================================================
-- RV College of Engineering - Department of Information Science & Eng.
-- DATABASE MANAGEMENT SYSTEMS (CD252IA)
-- PROJECT: CHESS TOURNAMENT MANAGEMENT AND PLAYER PERFORMANCE ANALYTICS
-- SUPABASE / POSTGRESQL FULL DATABASE SCHEMA (12 TABLES + ARENA)
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. PLAYER TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player (
  player_id       SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(120) NOT NULL UNIQUE,
  country         VARCHAR(60) NULL,
  date_of_birth   DATE NULL,
  current_rating  INT NOT NULL DEFAULT 1200,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_player_rating CHECK (current_rating BETWEEN 100 AND 3500)
);

-- ---------------------------------------------------------------------
-- 2. APP_USER TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_user (
  user_id        SERIAL PRIMARY KEY,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NULL,
  full_name      VARCHAR(100) NOT NULL,
  role           VARCHAR(10)  NOT NULL,
  status         VARCHAR(16)  NOT NULL DEFAULT 'PENDING_EMAIL',
  email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  phone          VARCHAR(20)  NULL,
  organization   VARCHAR(120) NULL,
  player_id      INT NULL UNIQUE,
  google_sub     VARCHAR(64) NULL UNIQUE,
  failed_logins  INT NOT NULL DEFAULT 0,
  locked_until   TIMESTAMP WITH TIME ZONE NULL,
  last_login_at  TIMESTAMP WITH TIME ZONE NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_user_role CHECK (role IN ('ADMIN', 'ORGANIZER', 'PLAYER')),
  CONSTRAINT chk_user_status CHECK (status IN ('PENDING_EMAIL', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED')),
  CONSTRAINT fk_user_player FOREIGN KEY (player_id)
      REFERENCES public.player(player_id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 3. TOURNAMENT TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament (
  tournament_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  format        VARCHAR(12)  NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        VARCHAR(10)  NOT NULL DEFAULT 'UPCOMING',
  created_by    INT NULL,
  CONSTRAINT chk_t_format CHECK (format IN ('ROUND_ROBIN', 'KNOCKOUT', 'SWISS')),
  CONSTRAINT chk_t_status CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED')),
  CONSTRAINT chk_t_dates  CHECK (end_date >= start_date),
  CONSTRAINT fk_tournament_creator FOREIGN KEY (created_by)
      REFERENCES public.app_user(user_id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 4. TOURNAMENT_ROUND TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_round (
  round_id      SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL,
  round_no      INT NOT NULL,
  status        VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED',
  CONSTRAINT chk_round_no     CHECK (round_no > 0),
  CONSTRAINT chk_round_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
  CONSTRAINT uq_round UNIQUE (tournament_id, round_no),
  CONSTRAINT fk_round_tournament FOREIGN KEY (tournament_id)
      REFERENCES public.tournament(tournament_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 5. GAME TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game (
  game_id         SERIAL PRIMARY KEY,
  round_id        INT NOT NULL,
  board_no        INT NOT NULL,
  white_player_id INT NOT NULL,
  black_player_id INT NOT NULL,
  start_time      TIMESTAMP WITH TIME ZONE NULL,
  end_time        TIMESTAMP WITH TIME ZONE NULL,
  status          VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED',
  CONSTRAINT chk_board CHECK (board_no > 0),
  CONSTRAINT chk_game_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'FINISHED')),
  CONSTRAINT chk_diff_players CHECK (white_player_id <> black_player_id),
  CONSTRAINT chk_game_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time),
  CONSTRAINT uq_board UNIQUE (round_id, board_no),
  CONSTRAINT fk_game_round FOREIGN KEY (round_id)
      REFERENCES public.tournament_round(round_id) ON DELETE CASCADE,
  CONSTRAINT fk_game_white FOREIGN KEY (white_player_id)
      REFERENCES public.player(player_id),
  CONSTRAINT fk_game_black FOREIGN KEY (black_player_id)
      REFERENCES public.player(player_id)
);

-- ---------------------------------------------------------------------
-- 6. RESULT TABLE (1:1 with Game)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.result (
  game_id     INT PRIMARY KEY,
  outcome     VARCHAR(5) NOT NULL,
  is_upset    BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_outcome CHECK (outcome IN ('WHITE', 'BLACK', 'DRAW')),
  CONSTRAINT fk_result_game FOREIGN KEY (game_id)
      REFERENCES public.game(game_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 7. REGISTRATION TABLE (Resolves Player M:N Tournament)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registration (
  registration_id SERIAL PRIMARY KEY,
  tournament_id   INT NOT NULL,
  player_id       INT NOT NULL,
  rating_at_entry INT NULL,
  registered_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_registration UNIQUE (tournament_id, player_id),
  CONSTRAINT fk_reg_tournament FOREIGN KEY (tournament_id)
      REFERENCES public.tournament(tournament_id) ON DELETE CASCADE,
  CONSTRAINT fk_reg_player FOREIGN KEY (player_id)
      REFERENCES public.player(player_id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 8. TOURNAMENT_STANDINGS TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_standings (
  tournament_id INT NOT NULL,
  player_id     INT NOT NULL,
  played        INT NOT NULL DEFAULT 0,
  wins          INT NOT NULL DEFAULT 0,
  draws         INT NOT NULL DEFAULT 0,
  losses        INT NOT NULL DEFAULT 0,
  points        NUMERIC(4,1) NOT NULL DEFAULT 0.0,
  rank_no       INT NULL,
  PRIMARY KEY (tournament_id, player_id),
  CONSTRAINT fk_st_tournament FOREIGN KEY (tournament_id)
      REFERENCES public.tournament(tournament_id) ON DELETE CASCADE,
  CONSTRAINT fk_st_player FOREIGN KEY (player_id)
      REFERENCES public.player(player_id)
);

-- ---------------------------------------------------------------------
-- 9. RATING_HISTORY TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rating_history (
  history_id    SERIAL PRIMARY KEY,
  player_id     INT NOT NULL,
  game_id       INT NOT NULL,
  old_rating    INT NOT NULL,
  new_rating    INT NOT NULL,
  rating_change INT NOT NULL,
  recorded_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_rh UNIQUE (player_id, game_id),
  CONSTRAINT fk_rh_player FOREIGN KEY (player_id)
      REFERENCES public.player(player_id),
  CONSTRAINT fk_rh_game FOREIGN KEY (game_id)
      REFERENCES public.game(game_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 10. PREDICTION TABLE (ML Performance Forecast)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prediction (
  prediction_id   SERIAL PRIMARY KEY,
  player_id       INT NOT NULL,
  tournament_id   INT NULL,
  predicted_score NUMERIC(4,2) NOT NULL,
  model_version   VARCHAR(30) NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pred_player FOREIGN KEY (player_id)
      REFERENCES public.player(player_id),
  CONSTRAINT fk_pred_tournament FOREIGN KEY (tournament_id)
      REFERENCES public.tournament(tournament_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 11. AUTH_TOKEN TABLE (Email verification & password reset)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_token (
  token_id   SERIAL PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose    VARCHAR(16) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at    TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_token_purpose CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
  CONSTRAINT fk_token_user FOREIGN KEY (user_id)
      REFERENCES public.app_user(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 12. ADMIN_USER TABLE (Standalone legacy administrator table)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_user (
  admin_id      SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'ADMIN'
);

-- ---------------------------------------------------------------------
-- 13. CHESS ARENA MULTIPLAYER EXTENSIONS (Rooms & Matches)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arena_rooms (
  room_id VARCHAR(64) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  time_control JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING_FOR_OPPONENT',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- ---------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_player_name ON public.player (name);
CREATE INDEX IF NOT EXISTS idx_player_rating ON public.player (current_rating);
CREATE INDEX IF NOT EXISTS idx_game_white ON public.game (white_player_id);
CREATE INDEX IF NOT EXISTS idx_game_black ON public.game (black_player_id);
CREATE INDEX IF NOT EXISTS idx_reg_player ON public.registration (player_id);
CREATE INDEX IF NOT EXISTS idx_rh_player_time ON public.rating_history (player_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_token_user ON public.auth_token (user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_arena_rooms_status ON public.arena_rooms (status);
CREATE INDEX IF NOT EXISTS idx_arena_matches_room ON public.arena_matches (room_id);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------
ALTER TABLE public.player ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_round ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_matches ENABLE ROW LEVEL SECURITY;

-- Idempotent read & modify policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'player', 'tournament', 'tournament_round', 'game', 'result',
        'registration', 'tournament_standings', 'rating_history',
        'prediction', 'app_user', 'auth_token', 'admin_user',
        'arena_rooms', 'arena_matches'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public Read %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public Read %I" ON public.%I FOR SELECT USING (true)', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public Modify %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public Modify %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- SUPABASE REALTIME REPLICATION
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.player;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.result;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_standings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_matches;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
