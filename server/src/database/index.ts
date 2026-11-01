import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import type { TimeControl, MatchResult, ChessMoveRecord, RoomState } from '../types/index.js';

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

class ChessArenaDatabase {
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
    // 1. If DATABASE_URL is provided (PostgreSQL / Supabase on Render), connect
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
        console.log('✓ Connected to PostgreSQL / Supabase storage');
        return;
      } catch (err) {
        console.warn('PostgreSQL connection unavailable, falling back to ACID local persistence:', err);
      }
    }

    // 2. Local zero-dependency persistent JSON store
    this.loadFromDisk();
    console.log(`✓ Local database initialized at ${this.localDbPath}`);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.localDbPath)) {
        const raw = fs.readFileSync(this.localDbPath, 'utf-8');
        this.memoryCache = JSON.parse(raw);
        console.log(`✓ Loaded ${Object.keys(this.memoryCache.rooms).length} rooms and ${Object.keys(this.memoryCache.matches).length} completed matches from disk.`);
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
    this.memoryCache.rooms[room.roomId] = room;
    this.saveToDisk();

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
    return this.memoryCache.rooms[roomId] || null;
  }

  public async saveMatch(match: PersistedMatch): Promise<void> {
    this.memoryCache.matches[match.matchId] = match;
    this.saveToDisk();

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
    return this.memoryCache.matches[matchId] || null;
  }

  public getAllMatches(): PersistedMatch[] {
    return Object.values(this.memoryCache.matches);
  }

  public getAllRooms(): PersistedRoom[] {
    return Object.values(this.memoryCache.rooms);
  }
}

export const db = new ChessArenaDatabase();
