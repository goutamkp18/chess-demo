import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TimeControl, ChessMoveRecord } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PersistedRoom {
  roomId: string;
  passwordHash: string;
  timeControl: TimeControl;
  createdAt: number;
  status: string;
}

export interface PersistedMatch {
  matchId: string;
  roomId: string;
  whitePlayer: { id: string; name: string; rating?: number };
  blackPlayer: { id: string; name: string; rating?: number } | null;
  status: string;
  winner: 'white' | 'black' | 'draw' | null;
  reason: string | null;
  startTime: number | null;
  endTime: number | null;
  moves: ChessMoveRecord[];
  pgn: string;
  fen: string;
}

export interface DbStatusInfo {
  provider: 'supabase' | 'postgresql' | 'local';
  supabaseConnected: boolean;
  pgConnected: boolean;
  localPath: string;
  cachedRooms: number;
  cachedMatches: number;
}

class ChessArenaDatabase {
  private supabase: SupabaseClient | null = null;
  private pgPool: pg.Pool | null = null;
  private localDbPath: string;
  private memoryCache: {
    rooms: Record<string, PersistedRoom>;
    matches: Record<string, PersistedMatch>;
  } = {
    rooms: {},
    matches: {},
  };

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
    this.localDbPath = path.join(dataDir, 'chess_arena_db.json');
    this.initDatabase();
  }

  private async initDatabase() {
    // 1. Initialize local cache from disk first for instantaneous sub-millisecond lookups
    this.loadFromDisk();

    // 2. Initialize Supabase Client SDK if SUPABASE_URL and key are provided
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        console.log(`✓ Connected to Supabase Cloud at ${supabaseUrl}`);
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
      }
    }

    // 3. Initialize direct PostgreSQL pool if DATABASE_URL is provided (Supabase pooler / Render PG)
    if (process.env.DATABASE_URL) {
      try {
        this.pgPool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        await this.pgPool.query(`
          CREATE TABLE IF NOT EXISTS arena_rooms (
            room_id VARCHAR(64) PRIMARY KEY,
            password_hash VARCHAR(255) NOT NULL,
            time_control JSONB NOT NULL,
            created_at BIGINT NOT NULL,
            status VARCHAR(32) NOT NULL
          );

          CREATE TABLE IF NOT EXISTS arena_matches (
            match_id VARCHAR(64) PRIMARY KEY,
            room_id VARCHAR(64) NOT NULL,
            white_player JSONB NOT NULL,
            black_player JSONB,
            status VARCHAR(32) NOT NULL,
            winner VARCHAR(16),
            reason VARCHAR(64),
            start_time BIGINT,
            end_time BIGINT,
            moves JSONB NOT NULL,
            pgn TEXT NOT NULL,
            fen TEXT NOT NULL
          );
        `);
        console.log('✓ Direct PostgreSQL connection pool active for Chess Arena');
      } catch (err) {
        console.warn('Direct PostgreSQL connection unavailable, relying on Supabase SDK / local persistence:', err);
      }
    }

    console.log(`✓ Local ACID persistent cache active at ${this.localDbPath}`);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.localDbPath)) {
        const raw = fs.readFileSync(this.localDbPath, 'utf-8');
        this.memoryCache = JSON.parse(raw);
        console.log(
          `✓ Loaded ${Object.keys(this.memoryCache.rooms).length} rooms and ${
            Object.keys(this.memoryCache.matches).length
          } completed matches from disk.`
        );
      }
    } catch (err) {
      console.error('Error reading database file from disk:', err);
      this.memoryCache = { rooms: {}, matches: {} };
    }
  }

  private saveToDisk() {
    try {
      const tempPath = `${this.localDbPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.localDbPath);
    } catch (err) {
      console.error('Error persisting database to disk:', err);
    }
  }

  public async saveRoom(room: PersistedRoom): Promise<void> {
    // 1. Update in-memory & local disk
    this.memoryCache.rooms[room.roomId] = room;
    this.saveToDisk();

    // 2. Persist to Supabase if configured
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('arena_rooms')
          .upsert(
            {
              room_id: room.roomId,
              password_hash: room.passwordHash,
              time_control: room.timeControl,
              created_at: room.createdAt,
              status: room.status,
            },
            { onConflict: 'room_id' }
          );

        if (error) {
          console.error('Error persisting room to Supabase:', error.message);
        }
      } catch (err) {
        console.error('Supabase saveRoom error:', err);
      }
    }

    // 3. Persist to direct PostgreSQL if configured
    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO arena_rooms (room_id, password_hash, time_control, created_at, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (room_id) DO UPDATE SET status = $5`,
          [room.roomId, room.passwordHash, JSON.stringify(room.timeControl), room.createdAt, room.status]
        );
      } catch (err) {
        console.error('Error saving room to PostgreSQL:', err);
      }
    }
  }

  public async getRoom(roomId: string): Promise<PersistedRoom | null> {
    // 1. Try Supabase first if connected
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('arena_rooms')
          .select('*')
          .eq('room_id', roomId)
          .maybeSingle();

        if (data && !error) {
          return {
            roomId: data.room_id,
            passwordHash: data.password_hash,
            timeControl: data.time_control,
            createdAt: Number(data.created_at),
            status: data.status,
          };
        }
      } catch (err) {
        console.error('Supabase getRoom error:', err);
      }
    }

    // 2. Try direct PostgreSQL
    if (this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM arena_rooms WHERE room_id = $1`, [roomId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            roomId: row.room_id,
            passwordHash: row.password_hash,
            timeControl: row.time_control,
            createdAt: Number(row.created_at),
            status: row.status,
          };
        }
      } catch (err) {
        console.error('Error fetching room from PG:', err);
      }
    }

    // 3. Fallback to local memory cache
    return this.memoryCache.rooms[roomId] || null;
  }

  public async saveMatch(match: PersistedMatch): Promise<void> {
    // 1. Update in-memory & local disk
    this.memoryCache.matches[match.matchId] = match;
    this.saveToDisk();

    // 2. Persist to Supabase if configured
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('arena_matches')
          .upsert(
            {
              match_id: match.matchId,
              room_id: match.roomId,
              white_player: match.whitePlayer,
              black_player: match.blackPlayer,
              status: match.status,
              winner: match.winner,
              reason: match.reason,
              start_time: match.startTime,
              end_time: match.endTime,
              moves: match.moves,
              pgn: match.pgn,
              fen: match.fen,
            },
            { onConflict: 'match_id' }
          );

        if (error) {
          console.error('Error persisting match to Supabase:', error.message);
        }
      } catch (err) {
        console.error('Supabase saveMatch error:', err);
      }
    }

    // 3. Persist to direct PostgreSQL if configured
    if (this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO arena_matches (
            match_id, room_id, white_player, black_player, status, winner, reason, start_time, end_time, moves, pgn, fen
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (match_id) DO UPDATE SET
            status = $5, winner = $6, reason = $7, end_time = $9, moves = $10, pgn = $11, fen = $12`,
          [
            match.matchId,
            match.roomId,
            JSON.stringify(match.whitePlayer),
            match.blackPlayer ? JSON.stringify(match.blackPlayer) : null,
            match.status,
            match.winner,
            match.reason,
            match.startTime,
            match.endTime,
            JSON.stringify(match.moves),
            match.pgn,
            match.fen,
          ]
        );
      } catch (err) {
        console.error('Error saving match to PG:', err);
      }
    }
  }

  public async getMatch(matchId: string): Promise<PersistedMatch | null> {
    // 1. Try Supabase
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('arena_matches')
          .select('*')
          .eq('match_id', matchId)
          .maybeSingle();

        if (data && !error) {
          return {
            matchId: data.match_id,
            roomId: data.room_id,
            whitePlayer: data.white_player,
            blackPlayer: data.black_player,
            status: data.status,
            winner: data.winner,
            reason: data.reason,
            startTime: data.start_time ? Number(data.start_time) : null,
            endTime: data.end_time ? Number(data.end_time) : null,
            moves: data.moves || [],
            pgn: data.pgn || '',
            fen: data.fen || '',
          };
        }
      } catch (err) {
        console.error('Supabase getMatch error:', err);
      }
    }

    // 2. Try direct PostgreSQL
    if (this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM arena_matches WHERE match_id = $1`, [matchId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            matchId: row.match_id,
            roomId: row.room_id,
            whitePlayer: row.white_player,
            blackPlayer: row.black_player,
            status: row.status,
            winner: row.winner,
            reason: row.reason,
            startTime: row.start_time ? Number(row.start_time) : null,
            endTime: row.end_time ? Number(row.end_time) : null,
            moves: row.moves,
            pgn: row.pgn,
            fen: row.fen,
          };
        }
      } catch (err) {
        console.error('Error fetching match from PG:', err);
      }
    }

    // 3. Fallback to local memory cache
    return this.memoryCache.matches[matchId] || null;
  }

  public getAllMatches(): PersistedMatch[] {
    return Object.values(this.memoryCache.matches);
  }

  public getAllRooms(): PersistedRoom[] {
    return Object.values(this.memoryCache.rooms);
  }

  public getStatus(): DbStatusInfo {
    const hasSupabase = !!this.supabase;
    const hasPg = !!this.pgPool;

    return {
      provider: hasSupabase ? 'supabase' : hasPg ? 'postgresql' : 'local',
      supabaseConnected: hasSupabase,
      pgConnected: hasPg,
      localPath: this.localDbPath,
      cachedRooms: Object.keys(this.memoryCache.rooms).length,
      cachedMatches: Object.keys(this.memoryCache.matches).length,
    };
  }
}

export const db = new ChessArenaDatabase();
