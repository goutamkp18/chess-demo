import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './sockets/socketHandlers.js';
import { createApiRouter } from './routes/apiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Initialize Room Manager
const roomManager = new RoomManager(io);

// Mount API routes
app.use('/api', createApiRouter(roomManager));

// Setup Real-Time Socket Handlers
setupSocketHandlers(io, roomManager);

// Fallback error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  const message = err instanceof Error ? err.message : 'Unknown error';
  res.status(500).json({ error: message });
});

httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`♔ CHESS ARENA MULTIPLAYER SERVER INITIALIZED ♔`);
  console.log(`   Listening on port: ${PORT}`);
  console.log(`   Authoritative 60-Second Walkover System: Active`);
  console.log(`   Real-time Engine: chess.js + Socket.IO`);
  console.log(`===============================================`);
});

export { app, httpServer, io, roomManager };

