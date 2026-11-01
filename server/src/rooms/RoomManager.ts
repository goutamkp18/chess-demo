import bcrypt from 'bcryptjs';
import type { Server } from 'socket.io';
import { ChessRoom } from './ChessRoom.js';
import { db } from '../database/index.js';
import type { TimeControl } from '../types/index.js';

export class RoomManager {
  private rooms: Map<string, ChessRoom> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initExistingRooms();
  }

  // Restore rooms previously saved in database
  private async initExistingRooms() {
    const savedRooms = db.getAllRooms();
    for (const r of savedRooms) {
      if (!this.rooms.has(r.roomId)) {
        const room = new ChessRoom(this.io, r.roomId, r.passwordHash, r.timeControl);
        this.rooms.set(r.roomId, room);
      }
    }
    console.log(`✓ Initialized RoomManager with ${this.rooms.size} active/cached rooms.`);
  }

  // Create room with hashed password
  public async createRoom(
    roomId: string,
    rawPassword: string,
    timeControl: TimeControl = { initialSeconds: 600, incrementSeconds: 5, name: '10 + 5 Blitz' }
  ): Promise<ChessRoom> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const room = new ChessRoom(this.io, roomId, passwordHash, timeControl);
    this.rooms.set(roomId, room);

    // Persist to DB
    await db.saveRoom({
      roomId,
      passwordHash,
      timeControl,
      createdAt: room.createdAt,
      status: room.status,
    });

    return room;
  }

  public getRoom(roomId: string): ChessRoom | undefined {
    return this.rooms.get(roomId);
  }

  // Verify room password
  public async verifyPassword(roomId: string, rawPassword?: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (!rawPassword) return false;
    return bcrypt.compare(rawPassword, room.passwordHash);
  }

  // Ensure room exists or create default if not existing
  public async getOrCreateRoom(
    roomId: string,
    rawPassword?: string,
    timeControl?: TimeControl
  ): Promise<{ room?: ChessRoom; error?: string }> {
    let room = this.rooms.get(roomId);

    if (!room) {
      // Check database
      const dbRoom = await db.getRoom(roomId);
      if (dbRoom) {
        room = new ChessRoom(this.io, dbRoom.roomId, dbRoom.passwordHash, dbRoom.timeControl);
        this.rooms.set(roomId, room);
      } else if (rawPassword) {
        // Create new room automatically on demand
        room = await this.createRoom(
          roomId,
          rawPassword,
          timeControl || { initialSeconds: 600, incrementSeconds: 5, name: '10 + 5 Blitz' }
        );
        return { room };
      } else {
        return { error: 'Room does not exist and no password provided to create it.' };
      }
    }

    if (rawPassword) {
      const match = await bcrypt.compare(rawPassword, room.passwordHash);
      if (!match) {
        return { error: 'Invalid room password. Access denied.' };
      }
    }

    return { room };
  }

  public getAllActiveRooms(): { roomId: string; status: string; playersCount: number }[] {
    return Array.from(this.rooms.values()).map((r) => ({
      roomId: r.roomId,
      status: r.status,
      playersCount: (r.whitePlayer ? 1 : 0) + (r.blackPlayer ? 1 : 0),
    }));
  }
}

