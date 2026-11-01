export type PlayerColor = 'w' | 'b';

export interface PlayerProfile {
  id: string;
  name: string;
  rating?: number;
  avatar?: string;
  title?: string;
  color?: PlayerColor;
  isReady?: boolean;
  connected: boolean;
  joinedAt: number;
}

export type MatchStatus =
  | 'WAITING_FOR_OPPONENT'
  | 'READY_CONFIRMATION'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'WALKOVER';

export type GameEndReason =
  | 'checkmate'
  | 'timeout'
  | 'resignation'
  | 'walkover'
  | 'stalemate'
  | 'threefold_repetition'
  | 'insufficient_material'
  | 'fifty_move_rule'
  | 'mutual_agreement';

export interface TimeControl {
  initialSeconds: number;
  incrementSeconds: number;
  name: string; // e.g. "10 + 5 Blitz", "5 + 0 Blitz", "15 + 10 Rapid"
}

export interface ChessMoveRecord {
  from: string;
  to: string;
  piece: string;
  color: PlayerColor;
  san: string;
  captured?: string;
  promotion?: string;
  timeSpentMs?: number;
  fenAfter: string;
  timestamp: number;
}

export interface ClockState {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  activeColor: PlayerColor | null;
  lastTickTimestamp: number;
}

export interface MatchResult {
  winner: 'white' | 'black' | 'draw';
  winnerPlayerId: string | null;
  reason: GameEndReason;
  message: string;
  completedAt: number;
}

export interface RoomState {
  roomId: string;
  status: MatchStatus;
  createdAt: number;
  waitingDeadline: number | null; // Authoritative server timestamp for 60s countdown
  timeControl: TimeControl;
  whitePlayer: PlayerProfile | null;
  blackPlayer: PlayerProfile | null;
  firstPlayerSlot: 'white' | 'black';
  fen: string;
  turn: PlayerColor;
  history: ChessMoveRecord[];
  clocks: ClockState;
  lastMove: { from: string; to: string; san: string } | null;
  capturedWhite: string[]; // Black pieces captured by white
  capturedBlack: string[]; // White pieces captured by black
  drawOfferedBy: string | null;
  result: MatchResult | null;
  pgn: string;
}

export interface JoinRoomPayload {
  roomId: string;
  password?: string;
  playerName: string;
  rating?: number;
  avatar?: string;
  reconnectToken?: string;
}

export interface AuthSuccessPayload {
  token: string;
  playerId: string;
  playerColor: PlayerColor;
  roomState: RoomState;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

