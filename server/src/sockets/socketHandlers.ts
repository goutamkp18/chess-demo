import type { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager.js';
import { SOCKET_EVENTS } from '../types/index.js';
import type { JoinRoomPayload } from '../types/index.js';

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    // 1. Room Join & Authentication
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (payload: JoinRoomPayload, callback?: (res: unknown) => void) => {
      try {
        const { roomId, password, playerName, rating, avatar, reconnectToken } = payload;

        if (!roomId || !roomId.trim()) {
          const err = { code: 'INVALID_ROOM', message: 'Room ID is required.' };
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, err);
          if (callback) callback({ success: false, error: err.message });
          return;
        }

        if (!playerName || !playerName.trim()) {
          const err = { code: 'INVALID_NAME', message: 'Player name is required.' };
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, err);
          if (callback) callback({ success: false, error: err.message });
          return;
        }

        // Verify or create room
        const roomResult = await roomManager.getOrCreateRoom(roomId.trim(), password);
        if (roomResult.error || !roomResult.room) {
          const err = { code: 'AUTH_FAILED', message: roomResult.error || 'Access denied.' };
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, err);
          if (callback) callback({ success: false, error: err.message });
          return;
        }

        const room = roomResult.room;
        const playerId = reconnectToken ? `p_${reconnectToken.slice(0, 8)}` : `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const joinRes = await room.handleJoin({
          socket,
          playerId,
          playerName: playerName.trim(),
          rating: rating || 1600,
          avatar,
          reconnectToken,
        });

        if (!joinRes.success) {
          const err = { code: 'JOIN_REJECTED', message: joinRes.error || 'Failed to join match.' };
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, err);
          if (callback) callback({ success: false, error: err.message });
          return;
        }

        currentRoomId = room.roomId;
        currentPlayerId = playerId;

        const authPayload = {
          token: joinRes.token,
          playerId,
          playerColor: joinRes.color,
          roomState: room.getRoomState(),
        };

        socket.emit(SOCKET_EVENTS.AUTH_SUCCESS, authPayload);
        if (callback) callback({ success: true, ...authPayload });
      } catch (err: unknown) {
        console.error('Error handling room join:', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        socket.emit(SOCKET_EVENTS.AUTH_ERROR, { code: 'SERVER_ERROR', message });
        if (callback) callback({ success: false, error: message });
      }
    });

    // 2. Ready Confirmation
    socket.on(SOCKET_EVENTS.SET_READY, ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      room.handleReady(playerId);
    });

    // 3. Move Submission
    socket.on(
      SOCKET_EVENTS.MAKE_MOVE,
      (
        {
          roomId,
          playerId,
          move,
        }: {
          roomId: string;
          playerId: string;
          move: { from: string; to: string; promotion?: string };
        },
        callback?: (res: { success: boolean; error?: string }) => void
      ) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          if (callback) callback({ success: false, error: 'Room not found.' });
          return;
        }

        const res = room.handleMove(playerId, move);
        if (!res.success) {
          socket.emit(SOCKET_EVENTS.ERROR, { code: 'ILLEGAL_MOVE', message: res.error });
        }
        if (callback) callback(res);
      }
    );

    // 4. Offer Draw
    socket.on(SOCKET_EVENTS.OFFER_DRAW, ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      room.handleOfferDraw(playerId);
    });

    // 5. Respond to Draw Offer
    socket.on(
      SOCKET_EVENTS.RESPOND_DRAW,
      ({ roomId, playerId, accept }: { roomId: string; playerId: string; accept: boolean }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        room.handleRespondDraw(playerId, accept);
      }
    );

    // 6. Resign Match
    socket.on(SOCKET_EVENTS.RESIGN, ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      room.handleResign(playerId);
    });

    // 7. Manual State Sync Request
    socket.on(SOCKET_EVENTS.SYNC_REQUEST, ({ roomId }: { roomId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        socket.emit(SOCKET_EVENTS.ROOM_UPDATED, { roomState: room.getRoomState() });
      }
    });

    // 8. Disconnect Handling
    socket.on('disconnect', () => {
      if (currentRoomId) {
        const room = roomManager.getRoom(currentRoomId);
        if (room) {
          room.handleDisconnect(socket.id);
        }
      }
    });
  });
}

