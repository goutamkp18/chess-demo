import { Router } from 'express';
import { RoomManager } from '../rooms/RoomManager.js';
import { db } from '../database/index.js';

export function createApiRouter(roomManager: RoomManager) {
  const router = Router();

  // Healthcheck
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Chess Arena API', timestamp: Date.now() });
  });

  // Create Room (Tournament API)
  router.post('/rooms', async (req, res) => {
    try {
      const { roomId, password, timeControl } = req.body;
      if (!roomId || !password) {
        return res.status(400).json({ error: 'roomId and password are required' });
      }

      const existing = roomManager.getRoom(roomId);
      if (existing) {
        return res.status(409).json({ error: 'Room ID already exists' });
      }

      const room = await roomManager.createRoom(roomId, password, timeControl);
      return res.status(201).json({
        message: 'Tournament room created successfully',
        roomId: room.roomId,
        timeControl: room.timeControl,
        status: room.status,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return res.status(500).json({ error: message });
    }
  });

  // Verify / Inspect Room
  router.get('/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      const dbRoom = await db.getRoom(roomId);
      if (!dbRoom) {
        return res.status(404).json({ error: 'Room not found' });
      }
      return res.json({
        roomId: dbRoom.roomId,
        status: dbRoom.status,
        timeControl: dbRoom.timeControl,
        availableSlots: 2,
      });
    }

    const state = room.getRoomState();
    const availableSlots = (state.whitePlayer ? 0 : 1) + (state.blackPlayer ? 0 : 1);

    return res.json({
      roomId: state.roomId,
      status: state.status,
      timeControl: state.timeControl,
      availableSlots,
      isFull: availableSlots === 0,
      isCompleted: state.status === 'COMPLETED' || state.status === 'WALKOVER',
    });
  });

  // Match History
  router.get('/history', (_req, res) => {
    const matches = db.getAllMatches();
    res.json({ matches });
  });

  router.get('/history/:matchId', async (req, res) => {
    const match = await db.getMatch(req.params.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match history not found' });
    }
    res.json(match);
  });

  return router;
}

