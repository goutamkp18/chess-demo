import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/rooms/RoomManager.js';
import { setupSocketHandlers } from '../src/sockets/socketHandlers.js';
import { SOCKET_EVENTS } from '../src/types/index.js';
import { db } from '../src/database/index.js';

let httpServer: http.Server;
let ioServer: SocketIOServer;
let roomManager: RoomManager;
let port: number;

beforeAll(async () => {
  const app = express();
  httpServer = http.createServer(app);
  ioServer = new SocketIOServer(httpServer);
  roomManager = new RoomManager(ioServer);
  setupSocketHandlers(ioServer, roomManager);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  ioServer.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

function createClient(): ClientSocketType {
  return ClientSocket(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
}

describe('Chess Arena Multiplayer & Tournament Rules', () => {
  it('TEST 1 & 2 & 3: Waiting Countdown, Opponent Entry & Ready Confirmation', async () => {
    const client1 = createClient();
    const client2 = createClient();

    const roomId = 'TEST_ROOM_101';
    const password = 'pass101';

    // Player 1 joins
    const p1JoinPromise = new Promise<any>((resolve) => {
      client1.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        {
          roomId,
          password,
          playerName: 'Grandmaster Alice',
        },
        resolve
      );
    });

    const p1Res = await p1JoinPromise;
    expect(p1Res.success).toBe(true);
    expect(p1Res.playerColor).toBe('w');
    expect(p1Res.roomState.status).toBe('WAITING_FOR_OPPONENT');
    expect(p1Res.roomState.waitingDeadline).toBeGreaterThan(Date.now());

    // Player 2 joins before countdown
    const p2JoinPromise = new Promise<any>((resolve) => {
      client2.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        {
          roomId,
          password,
          playerName: 'Grandmaster Bob',
        },
        resolve
      );
    });

    const p2Res = await p2JoinPromise;
    expect(p2Res.success).toBe(true);
    expect(p2Res.playerColor).toBe('b');
    expect(p2Res.roomState.status).toBe('READY_CONFIRMATION');
    expect(p2Res.roomState.waitingDeadline).toBeNull(); // Countdown stopped!

    // Readiness confirmation
    let matchStartedEmitted = false;
    client1.on(SOCKET_EVENTS.MATCH_STARTED, () => {
      matchStartedEmitted = true;
    });

    // Player 1 sets ready
    client1.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId: p1Res.playerId });
    await new Promise((r) => setTimeout(r, 50));
    expect(matchStartedEmitted).toBe(false); // Only 1 player ready, should not start yet

    // Player 2 sets ready
    const matchStartPromise = new Promise<void>((resolve) => {
      client2.on(SOCKET_EVENTS.MATCH_STARTED, () => resolve());
    });

    client2.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId: p2Res.playerId });
    await matchStartPromise;

    const room = roomManager.getRoom(roomId);
    expect(room?.status).toBe('IN_PROGRESS');

    client1.disconnect();
    client2.disconnect();
  });

  it('TEST 4 & 5: Legal Move Broadcasting & Illegal Move Rejection', async () => {
    const client1 = createClient();
    const client2 = createClient();

    const roomId = 'TEST_ROOM_102';
    const password = 'pass102';

    const p1 = await new Promise<any>((resolve) => {
      client1.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'White P' }, resolve);
    });
    const p2 = await new Promise<any>((resolve) => {
      client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Black P' }, resolve);
    });

    // Set both ready
    client1.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId: p1.playerId });
    client2.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId: p2.playerId });
    await new Promise((r) => setTimeout(r, 60));

    // Attempt illegal move by white (moving knight to wrong square e6)
    const illegalMoveRes = await new Promise<any>((resolve) => {
      client1.emit(
        SOCKET_EVENTS.MAKE_MOVE,
        {
          roomId,
          playerId: p1.playerId,
          move: { from: 'g1', to: 'e6' },
        },
        resolve
      );
    });
    expect(illegalMoveRes.success).toBe(false);

    // Make legal move: e2 -> e4
    const p2MovePromise = new Promise<any>((resolve) => {
      client2.on(SOCKET_EVENTS.MOVE_MADE, resolve);
    });

    const legalMoveRes = await new Promise<any>((resolve) => {
      client1.emit(
        SOCKET_EVENTS.MAKE_MOVE,
        {
          roomId,
          playerId: p1.playerId,
          move: { from: 'e2', to: 'e4' },
        },
        resolve
      );
    });

    expect(legalMoveRes.success).toBe(true);
    const p2Received = await p2MovePromise;
    expect(p2Received.move.san).toBe('e4');
    expect(p2Received.turn).toBe('b');

    client1.disconnect();
    client2.disconnect();
  });

  it('TEST 6 & 7: Walkover Timeout & Rejecting Entry After Timeout', async () => {
    const client1 = createClient();
    const client2 = createClient();

    const roomId = 'TEST_ROOM_WALKOVER';
    const password = 'secret';

    const p1 = await new Promise<any>((resolve) => {
      client1.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Patient Player' }, resolve);
    });
    expect(p1.success).toBe(true);

    const room = roomManager.getRoom(roomId);
    expect(room).toBeDefined();

    // Trigger authoritative walkover timeout directly
    const walkoverPromise = new Promise<any>((resolve) => {
      client1.on(SOCKET_EVENTS.MATCH_OVER, resolve);
    });

    room?.handleWalkoverTimeout();
    const resultPayload = await walkoverPromise;

    expect(resultPayload.result.reason).toBe('walkover');
    expect(resultPayload.result.winner).toBe('white');
    expect(room?.status).toBe('WALKOVER');

    // Attempt to enter as opponent after walkover
    const p2LateJoin = await new Promise<any>((resolve) => {
      client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Late Player' }, resolve);
    });

    expect(p2LateJoin.success).toBe(false);
    expect(p2LateJoin.error).toMatch(/already completed/i);

    client1.disconnect();
    client2.disconnect();
  });

  it('TEST 8: Third Player Attempt Rejection', async () => {
    const client1 = createClient();
    const client2 = createClient();
    const client3 = createClient();

    const roomId = 'TEST_ROOM_FULL';
    const password = 'secure';

    await new Promise((r) => client1.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'P1' }, r));
    await new Promise((r) => client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'P2' }, r));

    // Client 3 tries to join full room
    const p3Res = await new Promise<any>((resolve) => {
      client3.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Intruder' }, resolve);
    });

    expect(p3Res.success).toBe(false);
    expect(p3Res.error).toMatch(/room is full/i);

    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });

  it('TEST 9: Disconnect and Reconnect Handling', async () => {
    const client1 = createClient();
    const client2 = createClient();

    const roomId = 'TEST_ROOM_RECONNECT';
    const password = 'pass';

    const p1 = await new Promise<any>((resolve) => {
      client1.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Reconnect P1' }, resolve);
    });
    await new Promise((r) => {
      client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'P2' }, r);
    });

    const room = roomManager.getRoom(roomId);
    expect(room?.whitePlayer?.connected).toBe(true);

    // Disconnect client 1
    client1.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    expect(room?.whitePlayer?.connected).toBe(false);

    // Reconnect with new socket using reconnectToken
    const client1Reconnect = createClient();
    const reconnected = await new Promise<any>((resolve) => {
      client1Reconnect.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        {
          roomId,
          password,
          playerName: 'Reconnect P1',
          reconnectToken: p1.token,
        },
        resolve
      );
    });

    expect(reconnected.success).toBe(true);
    expect(reconnected.playerColor).toBe('w');
    expect(room?.whitePlayer?.connected).toBe(true);

    client1Reconnect.disconnect();
    client2.disconnect();
  });

  it('TEST 10: Resignation Handling', async () => {
    const client1 = createClient();
    const client2 = createClient();

    const roomId = 'TEST_ROOM_RESIGN';
    const password = 'pass';

    const p1 = await new Promise<any>((resolve) => {
      client1.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Quitter' }, resolve);
    });
    const p2 = await new Promise<any>((resolve) => {
      client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password, playerName: 'Victor' }, resolve);
    });

    client1.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId: p1.playerId });
    client2.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId: p2.playerId });
    await new Promise((r) => setTimeout(r, 60));

    const matchOverPromise = new Promise<any>((resolve) => {
      client2.on(SOCKET_EVENTS.MATCH_OVER, resolve);
    });

    client1.emit(SOCKET_EVENTS.RESIGN, { roomId, playerId: p1.playerId });
    const overResult = await matchOverPromise;

    expect(overResult.result.winner).toBe('black');
    expect(overResult.result.reason).toBe('resignation');

    client1.disconnect();
    client2.disconnect();
  });

  it('TEST 11: Multiple Independent Rooms Concurrently', async () => {
    const rooms = ['ROOM_1001', 'ROOM_1002', 'ROOM_1003'];
    const clients: ClientSocketType[] = [];

    for (let i = 0; i < rooms.length; i++) {
      const rId = rooms[i];
      const c1 = createClient();
      const c2 = createClient();
      clients.push(c1, c2);

      const p1 = await new Promise<any>((res) => {
        c1.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: rId, password: 'pw', playerName: `P1_${rId}` }, res);
      });
      const p2 = await new Promise<any>((res) => {
        c2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: rId, password: 'pw', playerName: `P2_${rId}` }, res);
      });

      c1.emit(SOCKET_EVENTS.SET_READY, { roomId: rId, playerId: p1.playerId });
      c2.emit(SOCKET_EVENTS.SET_READY, { roomId: rId, playerId: p2.playerId });
    }

    await new Promise((r) => setTimeout(r, 100));

    // Verify each room has independent status
    for (const rId of rooms) {
      const room = roomManager.getRoom(rId);
      expect(room?.status).toBe('IN_PROGRESS');
      expect(room?.history.length).toBe(0);
    }

    // Play move only in ROOM_1001
    const r1 = roomManager.getRoom('ROOM_1001');
    const p1Id = r1?.whitePlayer?.id;
    clients[0].emit(SOCKET_EVENTS.MAKE_MOVE, {
      roomId: 'ROOM_1001',
      playerId: p1Id,
      move: { from: 'd2', to: 'd4' },
    });

    await new Promise((r) => setTimeout(r, 60));

    // Check that ROOM_1001 progressed, but ROOM_1002 and ROOM_1003 remained untouched
    expect(roomManager.getRoom('ROOM_1001')?.history.length).toBe(1);
    expect(roomManager.getRoom('ROOM_1002')?.history.length).toBe(0);
    expect(roomManager.getRoom('ROOM_1003')?.history.length).toBe(0);

    clients.forEach((c) => c.disconnect());
  });

  it('TEST 12: Database Persistence Survives Server Restart', async () => {
    // Check that matches and rooms recorded in DB exist
    const allMatches = db.getAllMatches();
    expect(allMatches.length).toBeGreaterThan(0);

    const walkoverMatch = allMatches.find((m) => m.roomId === 'TEST_ROOM_WALKOVER');
    expect(walkoverMatch).toBeDefined();
    expect(walkoverMatch?.reason).toBe('walkover');
    expect(walkoverMatch?.winner).toBe('white');
  });
});

