import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import type { Server, Socket } from 'socket.io';
import { db, PersistedMatch } from '../database/index.js';
import { SOCKET_EVENTS } from '../types/index.js';
import type {
  PlayerColor,
  PlayerProfile,
  MatchStatus,
  TimeControl,
  RoomState,
  ChessMoveRecord,
  ClockState,
  MatchResult,
} from '../types/index.js';

export interface JoinOptions {
  socket: Socket;
  playerId: string;
  playerName: string;
  rating?: number;
  avatar?: string;
  reconnectToken?: string;
}

export class ChessRoom {
  public readonly roomId: string;
  public passwordHash: string;
  public timeControl: TimeControl;
  public status: MatchStatus = 'WAITING_FOR_OPPONENT';
  public createdAt: number;
  public waitingDeadline: number | null = null;
  private waitingTimer: NodeJS.Timeout | null = null;
  private clockInterval: NodeJS.Timeout | null = null;

  public whitePlayer: (PlayerProfile & { socketId: string; reconnectToken: string }) | null = null;
  public blackPlayer: (PlayerProfile & { socketId: string; reconnectToken: string }) | null = null;
  public firstPlayerSlot: 'white' | 'black' = 'white';

  private chess: Chess;
  public history: ChessMoveRecord[] = [];
  public clocks: ClockState;
  public lastMove: { from: string; to: string; san: string } | null = null;
  public capturedWhite: string[] = []; // Black pieces taken by White
  public capturedBlack: string[] = []; // White pieces taken by Black
  public drawOfferedBy: string | null = null;
  public result: MatchResult | null = null;
  private matchId: string;
  private matchStartTime: number | null = null;
  private io: Server;

  constructor(
    io: Server,
    roomId: string,
    passwordHash: string,
    timeControl: TimeControl = { initialSeconds: 600, incrementSeconds: 5, name: '10 + 5 Blitz' }
  ) {
    this.io = io;
    this.roomId = roomId;
    this.passwordHash = passwordHash;
    this.timeControl = timeControl;
    this.createdAt = Date.now();
    this.matchId = `match_${roomId}_${Date.now()}`;
    this.chess = new Chess();

    this.clocks = {
      whiteRemainingMs: timeControl.initialSeconds * 1000,
      blackRemainingMs: timeControl.initialSeconds * 1000,
      activeColor: null,
      lastTickTimestamp: Date.now(),
    };
  }

  public getRoomState(): RoomState {
    return {
      roomId: this.roomId,
      status: this.status,
      createdAt: this.createdAt,
      waitingDeadline: this.waitingDeadline,
      timeControl: this.timeControl,
      whitePlayer: this.whitePlayer ? { ...this.whitePlayer } : null,
      blackPlayer: this.blackPlayer ? { ...this.blackPlayer } : null,
      firstPlayerSlot: this.firstPlayerSlot,
      fen: this.chess.fen(),
      turn: this.chess.turn() as PlayerColor,
      history: this.history,
      clocks: { ...this.clocks },
      lastMove: this.lastMove,
      capturedWhite: [...this.capturedWhite],
      capturedBlack: [...this.capturedBlack],
      drawOfferedBy: this.drawOfferedBy,
      result: this.result ? { ...this.result } : null,
      pgn: this.chess.pgn(),
    };
  }

  // Handle player registration / join
  public async handleJoin(options: JoinOptions): Promise<{
    success: boolean;
    error?: string;
    token?: string;
    color?: PlayerColor;
  }> {
    const { socket, playerId, playerName, rating, avatar, reconnectToken } = options;

    // Check if match is already concluded
    if (this.status === 'COMPLETED' || this.status === 'WALKOVER') {
      return { success: false, error: 'Match has already completed and is no longer joinable.' };
    }

    // 1. Reconnection attempt by existing player
    if (reconnectToken) {
      if (this.whitePlayer && this.whitePlayer.reconnectToken === reconnectToken) {
        this.whitePlayer.socketId = socket.id;
        this.whitePlayer.connected = true;
        await socket.join(this.roomId);
        this.broadcastRoomState();
        this.io.to(this.roomId).emit(SOCKET_EVENTS.OPPONENT_RECONNECTED, {
          color: 'w',
          playerId: this.whitePlayer.id,
        });
        return { success: true, token: reconnectToken, color: 'w' };
      }
      if (this.blackPlayer && this.blackPlayer.reconnectToken === reconnectToken) {
        this.blackPlayer.socketId = socket.id;
        this.blackPlayer.connected = true;
        await socket.join(this.roomId);
        this.broadcastRoomState();
        this.io.to(this.roomId).emit(SOCKET_EVENTS.OPPONENT_RECONNECTED, {
          color: 'b',
          playerId: this.blackPlayer.id,
        });
        return { success: true, token: reconnectToken, color: 'b' };
      }
    }

    // Check by playerId if re-joining
    if (this.whitePlayer && this.whitePlayer.id === playerId) {
      this.whitePlayer.socketId = socket.id;
      this.whitePlayer.connected = true;
      await socket.join(this.roomId);
      this.broadcastRoomState();
      return { success: true, token: this.whitePlayer.reconnectToken, color: 'w' };
    }
    if (this.blackPlayer && this.blackPlayer.id === playerId) {
      this.blackPlayer.socketId = socket.id;
      this.blackPlayer.connected = true;
      await socket.join(this.roomId);
      this.broadcastRoomState();
      return { success: true, token: this.blackPlayer.reconnectToken, color: 'b' };
    }

    // Reject 3rd player if both slots occupied
    if (this.whitePlayer && this.blackPlayer) {
      return { success: false, error: 'Room is full. Exactly two players allowed in tournament match.' };
    }

    const token = uuidv4();

    // 2. First Player Entry: Start 60-Second Countdown
    if (!this.whitePlayer && !this.blackPlayer) {
      // First player gets assigned White (standard tournament assignment)
      this.firstPlayerSlot = 'white';
      this.whitePlayer = {
        id: playerId,
        name: playerName,
        rating: rating || 1600,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerName)}`,
        color: 'w',
        isReady: false,
        connected: true,
        joinedAt: Date.now(),
        socketId: socket.id,
        reconnectToken: token,
      };

      this.status = 'WAITING_FOR_OPPONENT';
      this.waitingDeadline = Date.now() + 60_000;

      // Authoritative 60-second Walkover Timer
      this.waitingTimer = setTimeout(() => {
        this.handleWalkoverTimeout();
      }, 60_000);

      await socket.join(this.roomId);
      this.broadcastRoomState();
      return { success: true, token, color: 'w' };
    }

    // 3. Second Player Entry: Stop Waiting Countdown Immediately
    if (this.whitePlayer && !this.blackPlayer) {
      if (this.waitingTimer) {
        clearTimeout(this.waitingTimer);
        this.waitingTimer = null;
      }
      this.waitingDeadline = null;

      this.blackPlayer = {
        id: playerId,
        name: playerName,
        rating: rating || 1600,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerName)}`,
        color: 'b',
        isReady: false,
        connected: true,
        joinedAt: Date.now(),
        socketId: socket.id,
        reconnectToken: token,
      };

      // Both players connected -> Move to READY confirmation
      this.status = 'READY_CONFIRMATION';

      await socket.join(this.roomId);
      this.broadcastRoomState();

      this.io.to(this.roomId).emit(SOCKET_EVENTS.OPPONENT_JOINED, {
        player: { ...this.blackPlayer },
      });

      return { success: true, token, color: 'b' };
    }

    return { success: false, error: 'Unable to join match.' };
  }

  // Handle Player Disconnection
  public handleDisconnect(socketId: string) {
    let disconnectedColor: PlayerColor | null = null;
    let disconnectedPlayer: PlayerProfile | null = null;

    if (this.whitePlayer && this.whitePlayer.socketId === socketId) {
      this.whitePlayer.connected = false;
      disconnectedColor = 'w';
      disconnectedPlayer = this.whitePlayer;

      // If disconnected during READY check, reset ready status
      if (this.status === 'READY_CONFIRMATION') {
        this.whitePlayer.isReady = false;
      }
    } else if (this.blackPlayer && this.blackPlayer.socketId === socketId) {
      this.blackPlayer.connected = false;
      disconnectedColor = 'b';
      disconnectedPlayer = this.blackPlayer;

      if (this.status === 'READY_CONFIRMATION') {
        this.blackPlayer.isReady = false;
      }
    }

    if (disconnectedColor && disconnectedPlayer) {
      this.io.to(this.roomId).emit(SOCKET_EVENTS.OPPONENT_DISCONNECTED, {
        color: disconnectedColor,
        playerId: disconnectedPlayer.id,
      });
      this.broadcastRoomState();
    }
  }

  // Authoritative 60s Walkover Execution
  public handleWalkoverTimeout() {
    if (this.status !== 'WAITING_FOR_OPPONENT') return;

    if (this.waitingTimer) {
      clearTimeout(this.waitingTimer);
      this.waitingTimer = null;
    }

    this.status = 'WALKOVER';
    const winnerSlot = this.firstPlayerSlot;
    const winnerPlayer = winnerSlot === 'white' ? this.whitePlayer : this.blackPlayer;

    this.result = {
      winner: winnerSlot,
      winnerPlayerId: winnerPlayer ? winnerPlayer.id : null,
      reason: 'walkover',
      message: 'Opponent failed to join within the allowed 60 seconds.',
      completedAt: Date.now(),
    };

    this.persistMatchResult();
    this.broadcastRoomState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.MATCH_OVER, { result: this.result });
  }

  // Ready Confirmation Handling
  public handleReady(playerId: string): { success: boolean; started: boolean } {
    if (this.status !== 'READY_CONFIRMATION') {
      return { success: false, started: false };
    }

    if (this.whitePlayer && this.whitePlayer.id === playerId) {
      this.whitePlayer.isReady = true;
    } else if (this.blackPlayer && this.blackPlayer.id === playerId) {
      this.blackPlayer.isReady = true;
    } else {
      return { success: false, started: false };
    }

    this.io.to(this.roomId).emit(SOCKET_EVENTS.PLAYER_READY_STATUS, {
      whiteReady: this.whitePlayer?.isReady ?? false,
      blackReady: this.blackPlayer?.isReady ?? false,
    });

    // Check if BOTH are ready and connected
    if (
      this.whitePlayer?.isReady &&
      this.whitePlayer.connected &&
      this.blackPlayer?.isReady &&
      this.blackPlayer.connected
    ) {
      this.startMatch();
      return { success: true, started: true };
    }

    this.broadcastRoomState();
    return { success: true, started: false };
  }

  // Start the actual chess game and authoritative clock
  private startMatch() {
    this.status = 'IN_PROGRESS';
    this.matchStartTime = Date.now();
    this.chess.reset();
    this.history = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.lastMove = null;
    this.drawOfferedBy = null;

    this.clocks = {
      whiteRemainingMs: this.timeControl.initialSeconds * 1000,
      blackRemainingMs: this.timeControl.initialSeconds * 1000,
      activeColor: 'w',
      lastTickTimestamp: Date.now(),
    };

    this.startClockTicker();

    this.broadcastRoomState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.MATCH_STARTED, {
      fen: this.chess.fen(),
      clocks: this.clocks,
      timeControl: this.timeControl,
    });
  }

  // Authoritative server clock ticker (checks timeout every 100ms)
  private startClockTicker() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    this.clockInterval = setInterval(() => {
      if (this.status !== 'IN_PROGRESS' || !this.clocks.activeColor) {
        if (this.clockInterval) clearInterval(this.clockInterval);
        return;
      }

      const now = Date.now();
      const elapsed = now - this.clocks.lastTickTimestamp;
      this.clocks.lastTickTimestamp = now;

      if (this.clocks.activeColor === 'w') {
        this.clocks.whiteRemainingMs = Math.max(0, this.clocks.whiteRemainingMs - elapsed);
        if (this.clocks.whiteRemainingMs === 0) {
          this.handleTimeout('w');
        }
      } else {
        this.clocks.blackRemainingMs = Math.max(0, this.clocks.blackRemainingMs - elapsed);
        if (this.clocks.blackRemainingMs === 0) {
          this.handleTimeout('b');
        }
      }
    }, 250);
  }

  // Handle Timeout
  private handleTimeout(flaggedColor: PlayerColor) {
    if (this.status !== 'IN_PROGRESS') return;

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }

    const winnerColor: 'white' | 'black' = flaggedColor === 'w' ? 'black' : 'white';
    const winnerPlayer = winnerColor === 'white' ? this.whitePlayer : this.blackPlayer;

    this.status = 'COMPLETED';
    this.result = {
      winner: winnerColor,
      winnerPlayerId: winnerPlayer ? winnerPlayer.id : null,
      reason: 'timeout',
      message: `${flaggedColor === 'w' ? 'White' : 'Black'} ran out of time.`,
      completedAt: Date.now(),
    };

    this.persistMatchResult();
    this.broadcastRoomState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.MATCH_OVER, { result: this.result });
  }

  // Authoritative Move Validation and Execution
  public handleMove(
    playerId: string,
    move: { from: string; to: string; promotion?: string }
  ): { success: boolean; error?: string } {
    if (this.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Match is not in progress.' };
    }

    const activeColor = this.chess.turn() as PlayerColor;
    const activePlayer = activeColor === 'w' ? this.whitePlayer : this.blackPlayer;

    if (!activePlayer || activePlayer.id !== playerId) {
      return { success: false, error: 'Not your turn.' };
    }

    // Deduct elapsed time before moving
    const now = Date.now();
    const elapsed = now - this.clocks.lastTickTimestamp;
    if (activeColor === 'w') {
      this.clocks.whiteRemainingMs = Math.max(0, this.clocks.whiteRemainingMs - elapsed);
    } else {
      this.clocks.blackRemainingMs = Math.max(0, this.clocks.blackRemainingMs - elapsed);
    }

    // Validate and execute move on authoritative engine
    try {
      const moveResult = this.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (!moveResult) {
        return { success: false, error: 'Illegal move.' };
      }

      // Add time increment to active player's clock
      if (activeColor === 'w') {
        this.clocks.whiteRemainingMs += this.timeControl.incrementSeconds * 1000;
      } else {
        this.clocks.blackRemainingMs += this.timeControl.incrementSeconds * 1000;
      }

      // Record captured pieces
      if (moveResult.captured) {
        if (activeColor === 'w') {
          this.capturedWhite.push(moveResult.captured);
        } else {
          this.capturedBlack.push(moveResult.captured);
        }
      }

      const moveRecord: ChessMoveRecord = {
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        color: activeColor,
        san: moveResult.san,
        captured: moveResult.captured,
        promotion: moveResult.promotion,
        timeSpentMs: elapsed,
        fenAfter: this.chess.fen(),
        timestamp: now,
      };

      this.history.push(moveRecord);
      this.lastMove = { from: moveResult.from, to: moveResult.to, san: moveResult.san };

      // Switch active turn clock
      const nextTurn = this.chess.turn() as PlayerColor;
      this.clocks.activeColor = nextTurn;
      this.clocks.lastTickTimestamp = now;

      // Check game endings
      if (this.chess.isGameOver()) {
        if (this.clockInterval) {
          clearInterval(this.clockInterval);
          this.clockInterval = null;
        }
        this.status = 'COMPLETED';

        if (this.chess.isCheckmate()) {
          const winnerColor = activeColor === 'w' ? 'white' : 'black';
          const winner = activeColor === 'w' ? this.whitePlayer : this.blackPlayer;
          this.result = {
            winner: winnerColor,
            winnerPlayerId: winner ? winner.id : null,
            reason: 'checkmate',
            message: `Checkmate! ${activeColor === 'w' ? 'White' : 'Black'} wins.`,
            completedAt: now,
          };
        } else if (this.chess.isStalemate()) {
          this.result = {
            winner: 'draw',
            winnerPlayerId: null,
            reason: 'stalemate',
            message: 'Game drawn by Stalemate.',
            completedAt: now,
          };
        } else if (this.chess.isThreefoldRepetition()) {
          this.result = {
            winner: 'draw',
            winnerPlayerId: null,
            reason: 'threefold_repetition',
            message: 'Game drawn by Threefold Repetition.',
            completedAt: now,
          };
        } else if (this.chess.isInsufficientMaterial()) {
          this.result = {
            winner: 'draw',
            winnerPlayerId: null,
            reason: 'insufficient_material',
            message: 'Game drawn due to Insufficient Material.',
            completedAt: now,
          };
        } else {
          this.result = {
            winner: 'draw',
            winnerPlayerId: null,
            reason: 'fifty_move_rule',
            message: 'Game drawn by 50-move rule.',
            completedAt: now,
          };
        }

        this.persistMatchResult();
        this.broadcastRoomState();
        this.io.to(this.roomId).emit(SOCKET_EVENTS.MATCH_OVER, { result: this.result });
        return { success: true };
      }

      // Broadcast move to both players
      this.io.to(this.roomId).emit(SOCKET_EVENTS.MOVE_MADE, {
        move: moveRecord,
        fen: this.chess.fen(),
        turn: nextTurn,
        clocks: this.clocks,
        capturedWhite: this.capturedWhite,
        capturedBlack: this.capturedBlack,
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Illegal move attempted.' };
    }
  }

  // Resignation
  public handleResign(playerId: string): { success: boolean; error?: string } {
    if (this.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Match is not in progress.' };
    }

    const resigningColor: PlayerColor =
      this.whitePlayer?.id === playerId ? 'w' : this.blackPlayer?.id === playerId ? 'b' : 'w';

    const winnerColor = resigningColor === 'w' ? 'black' : 'white';
    const winnerPlayer = winnerColor === 'white' ? this.whitePlayer : this.blackPlayer;

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }

    this.status = 'COMPLETED';
    this.result = {
      winner: winnerColor,
      winnerPlayerId: winnerPlayer ? winnerPlayer.id : null,
      reason: 'resignation',
      message: `${resigningColor === 'w' ? 'White' : 'Black'} has resigned.`,
      completedAt: Date.now(),
    };

    this.persistMatchResult();
    this.broadcastRoomState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.MATCH_OVER, { result: this.result });

    return { success: true };
  }

  // Draw Offer
  public handleOfferDraw(playerId: string): { success: boolean; error?: string } {
    if (this.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Match is not in progress.' };
    }

    this.drawOfferedBy = playerId;
    this.io.to(this.roomId).emit(SOCKET_EVENTS.DRAW_OFFERED, { offeredByPlayerId: playerId });
    this.broadcastRoomState();
    return { success: true };
  }

  // Draw Response
  public handleRespondDraw(playerId: string, accept: boolean): { success: boolean; error?: string } {
    if (this.status !== 'IN_PROGRESS' || !this.drawOfferedBy) {
      return { success: false, error: 'No active draw offer.' };
    }

    if (this.drawOfferedBy === playerId) {
      return { success: false, error: 'Cannot accept your own draw offer.' };
    }

    this.drawOfferedBy = null;

    if (accept) {
      if (this.clockInterval) {
        clearInterval(this.clockInterval);
        this.clockInterval = null;
      }
      this.status = 'COMPLETED';
      this.result = {
        winner: 'draw',
        winnerPlayerId: null,
        reason: 'mutual_agreement',
        message: 'Game drawn by mutual agreement.',
        completedAt: Date.now(),
      };
      this.persistMatchResult();
      this.broadcastRoomState();
      this.io.to(this.roomId).emit(SOCKET_EVENTS.MATCH_OVER, { result: this.result });
    } else {
      this.io.to(this.roomId).emit(SOCKET_EVENTS.DRAW_RESOLVED, { accepted: false });
      this.broadcastRoomState();
    }

    return { success: true };
  }

  // Broadcast Authoritative Room State
  public broadcastRoomState() {
    const state = this.getRoomState();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, {
      roomState: state,
    });

    // Also send directly to each player socket to guarantee delivery
    if (this.whitePlayer?.socketId) {
      this.io.to(this.whitePlayer.socketId).emit(SOCKET_EVENTS.ROOM_UPDATED, {
        roomState: state,
      });
    }
    if (this.blackPlayer?.socketId) {
      this.io.to(this.blackPlayer.socketId).emit(SOCKET_EVENTS.ROOM_UPDATED, {
        roomState: state,
      });
    }
  }

  // Persist Match to Database
  private async persistMatchResult() {
    const persisted: PersistedMatch = {
      matchId: this.matchId,
      roomId: this.roomId,
      whitePlayer: {
        id: this.whitePlayer?.id || 'unknown',
        name: this.whitePlayer?.name || 'White Player',
        rating: this.whitePlayer?.rating,
      },
      blackPlayer: this.blackPlayer
        ? {
            id: this.blackPlayer.id,
            name: this.blackPlayer.name,
            rating: this.blackPlayer.rating,
          }
        : null,
      status: this.status,
      winner: this.result?.winner || null,
      reason: this.result?.reason || null,
      startTime: this.matchStartTime,
      endTime: Date.now(),
      moves: this.history,
      pgn: this.chess.pgn(),
      fen: this.chess.fen(),
    };

    await db.saveMatch(persisted);
  }

  public cleanup() {
    if (this.waitingTimer) {
      clearTimeout(this.waitingTimer);
      this.waitingTimer = null;
    }
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
}
