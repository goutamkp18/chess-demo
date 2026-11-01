import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../types/index';
import type { JoinRoomPayload, AuthSuccessPayload, RoomState } from '../types/index';

class SocketService {
  private socket: Socket | null = null;
  private url: string;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.url = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  }

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 500,
      });

      this.socket.on('connect', () => {
        console.log('✓ Socket connected to server:', this.socket?.id);
        // Re-attach all registered listeners to the socket
        for (const [event, handlers] of this.listeners.entries()) {
          for (const handler of handlers) {
            this.socket?.on(event, handler as any);
          }
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('⚠ Socket disconnected:', reason);
      });
    }
    return this.socket;
  }

  public getSocket(): Socket {
    return this.connect();
  }

  public on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.connect().on(event, handler as any);
  }

  public off(event: string, handler: Function) {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler as any);
  }

  public joinRoom(payload: JoinRoomPayload): Promise<{ success: boolean; data?: AuthSuccessPayload; error?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, payload, (res: { success: boolean; token?: string; playerId?: string; playerColor?: string; roomState?: RoomState; error?: string }) => {
        if (res && res.success && res.roomState) {
          resolve({
            success: true,
            data: {
              token: res.token!,
              playerId: res.playerId!,
              playerColor: res.playerColor as any,
              roomState: res.roomState,
            },
          });
        } else {
          resolve({ success: false, error: res?.error || 'Failed to join match' });
        }
      });
    });
  }

  public setReady(roomId: string, playerId: string) {
    this.socket?.emit(SOCKET_EVENTS.SET_READY, { roomId, playerId });
  }

  public makeMove(
    roomId: string,
    playerId: string,
    move: { from: string; to: string; promotion?: string }
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket?.emit(SOCKET_EVENTS.MAKE_MOVE, { roomId, playerId, move }, (res: { success: boolean; error?: string }) => {
        resolve(res || { success: false, error: 'Network timeout' });
      });
    });
  }

  public offerDraw(roomId: string, playerId: string) {
    this.socket?.emit(SOCKET_EVENTS.OFFER_DRAW, { roomId, playerId });
  }

  public respondDraw(roomId: string, playerId: string, accept: boolean) {
    this.socket?.emit(SOCKET_EVENTS.RESPOND_DRAW, { roomId, playerId, accept });
  }

  public resign(roomId: string, playerId: string) {
    this.socket?.emit(SOCKET_EVENTS.RESIGN, { roomId, playerId });
  }

  public requestSync(roomId: string) {
    this.socket?.emit(SOCKET_EVENTS.SYNC_REQUEST, { roomId });
  }

  public leaveRoom(roomId: string) {
    this.socket?.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId });
  }

  public disconnect() {
    // Keep socket instance intact so event handlers remain bound, just emit leave
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.LEAVE_ROOM, {});
    }
  }
}

export const socketService = new SocketService();
