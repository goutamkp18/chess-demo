import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Volume2,
  VolumeX,
  Flag,
  Handshake,
  RotateCw,
  Clock,
  ChevronLeft,
  Info,
  Check,
  X,
} from 'lucide-react';
import type {
  RoomState,
  PlayerProfile,
  PlayerColor,
} from '../types/index';
import { Chessboard } from './Chessboard';
import { GameOverModal } from './GameOverModal';
import { soundManager } from '../utils/sound';

interface GameScreenProps {
  roomState: RoomState;
  myId: string;
  myColor: PlayerColor;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  onOfferDraw: () => void;
  onRespondDraw: (accept: boolean) => void;
  onResign: () => void;
  onExit: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  roomState,
  myId,
  myColor,
  onMove,
  onOfferDraw,
  onRespondDraw,
  onResign,
  onExit,
}) => {
  const [boardOrientation, setBoardOrientation] = useState<PlayerColor>(myColor);
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Live client-side interpolated clock states
  const [whiteRemainingMs, setWhiteRemainingMs] = useState(roomState.clocks.whiteRemainingMs);
  const [blackRemainingMs, setBlackRemainingMs] = useState(roomState.clocks.blackRemainingMs);

  const moveHistoryEndRef = useRef<HTMLDivElement>(null);

  // Sync clocks when authoritative server clock updates
  useEffect(() => {
    setWhiteRemainingMs(roomState.clocks.whiteRemainingMs);
    setBlackRemainingMs(roomState.clocks.blackRemainingMs);
  }, [roomState.clocks]);

  // Interpolate clock countdown every 100ms when match is IN_PROGRESS
  useEffect(() => {
    if (roomState.status !== 'IN_PROGRESS' || !roomState.clocks.activeColor) return;

    const interval = setInterval(() => {
      const active = roomState.clocks.activeColor;
      if (active === 'w') {
        setWhiteRemainingMs((prev) => Math.max(0, prev - 100));
      } else if (active === 'b') {
        setBlackRemainingMs((prev) => Math.max(0, prev - 100));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [roomState.status, roomState.clocks.activeColor]);

  // Auto-scroll move history
  useEffect(() => {
    moveHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomState.history]);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const flipBoard = () => {
    setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
    soundManager.playClick();
  };

  const formatClock = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Determine top player (opponent) and bottom player (you or white/black depending on orientation)
  const isOpponentWhite = boardOrientation === 'b';
  const topPlayer: PlayerProfile | null = isOpponentWhite ? roomState.whitePlayer : roomState.blackPlayer;
  const bottomPlayer: PlayerProfile | null = isOpponentWhite ? roomState.blackPlayer : roomState.whitePlayer;

  const topClockMs = isOpponentWhite ? whiteRemainingMs : blackRemainingMs;
  const bottomClockMs = isOpponentWhite ? blackRemainingMs : whiteRemainingMs;

  const topColor: PlayerColor = isOpponentWhite ? 'w' : 'b';
  const bottomColor: PlayerColor = isOpponentWhite ? 'b' : 'w';

  const isTopActive = roomState.turn === topColor && roomState.status === 'IN_PROGRESS';
  const isBottomActive = roomState.turn === bottomColor && roomState.status === 'IN_PROGRESS';

  // Group moves into pairs (White move, Black move)
  const movePairs: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < roomState.history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: roomState.history[i]?.san,
      black: roomState.history[i + 1]?.san,
    });
  }

  // Calculate material difference
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const whiteCapturedValue = roomState.capturedWhite.reduce((sum, p) => sum + (pieceValues[p.toLowerCase()] || 0), 0);
  const blackCapturedValue = roomState.capturedBlack.reduce((sum, p) => sum + (pieceValues[p.toLowerCase()] || 0), 0);
  const materialDiff = whiteCapturedValue - blackCapturedValue;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#FAF7F2] flex flex-col font-['Outfit'] select-none">
      {/* Top Header Bar */}
      <header className="px-4 py-3 border-b border-[#2A241F] bg-[#110F0D]/90 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D9A441] to-[#996B1E] flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5 text-[#0B0B0D] fill-current" />
            </div>
            <span className="font-['Cinzel'] font-bold text-lg text-[#F5C66A] tracking-wider hidden sm:inline">
              CHESS ARENA
            </span>
          </div>

          <button
            onClick={onExit}
            className="flex items-center gap-1 text-xs text-[#9E9689] hover:text-[#FAF7F2] transition-colors py-1 px-2.5 rounded-lg bg-[#1D1915] border border-[#2A241F] cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>
        </div>

        {/* Room & Status Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1D1915] border border-[#D9A441]/30 text-xs font-semibold text-[#D9A441]">
            <span>ROOM #{roomState.roomId}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-[#1D1915] border border-[#2A241F] px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </div>
      </header>

      {/* Draw Offer Notification Banner */}
      {roomState.drawOfferedBy && roomState.drawOfferedBy !== myId && (
        <div className="bg-[#2A231C] border-b border-[#D9A441]/50 px-4 py-2.5 flex items-center justify-between text-xs animate-slide-down">
          <div className="flex items-center gap-2 text-[#F5C66A]">
            <Handshake className="w-4 h-4" />
            <span>Opponent has offered a draw. Accept?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRespondDraw(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors cursor-pointer font-bold"
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </button>
            <button
              onClick={() => onRespondDraw(false)}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
          </div>
        </div>
      )}

      {/* Main 3-Column Arena Interface (Matching Reference Layout) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
        {/* LEFT COLUMN: Players & Clocks (Desktop: 3 cols) */}
        <div className="lg:col-span-3 flex lg:flex-col justify-between lg:justify-center gap-4 lg:gap-8 order-2 lg:order-1">
          {/* Top Player (Opponent) Card & Clock */}
          <div className="flex-1 lg:flex-initial space-y-2">
            <div className="luxury-card p-3.5 rounded-xl border border-[#2A241F] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={topPlayer?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topPlayer?.name || 'opponent'}`}
                    alt={topPlayer?.name || 'Opponent'}
                    className="w-10 h-10 rounded-full bg-[#2A231C] border border-[#D9A441]/40"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1D1915] ${
                      topPlayer?.connected ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-[#FAF7F2]">
                    <span>{topPlayer?.name || 'Waiting...'}</span>
                    <span className="text-[10px] text-[#D9A441] font-bold">
                      {topColor === 'w' ? '♔' : '♚'}
                    </span>
                  </div>
                  <div className="text-xs text-[#9E9689]">{topPlayer?.rating || 1600}</div>
                </div>
              </div>
            </div>

            {/* Top Digital Clock Display */}
            <div
              className={`p-3.5 sm:p-4 rounded-xl border text-center transition-all duration-200 ${
                isTopActive
                  ? 'bg-[#231E18] border-[#D9A441] shadow-lg shadow-[#D9A441]/10 ring-1 ring-[#D9A441]/50'
                  : 'bg-[#151311] border-[#2A241F]'
              }`}
            >
              <div
                className={`digital-clock-display text-2xl sm:text-3xl font-bold tracking-widest ${
                  isTopActive ? 'text-[#F5C66A]' : 'text-[#FAF7F2]/80'
                }`}
              >
                {formatClock(topClockMs)}
              </div>
            </div>
          </div>

          {/* Bottom Player (You) Card & Clock */}
          <div className="flex-1 lg:flex-initial space-y-2">
            <div className="luxury-card p-3.5 rounded-xl border border-[#2A241F] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={bottomPlayer?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${bottomPlayer?.name || 'you'}`}
                    alt={bottomPlayer?.name || 'You'}
                    className="w-10 h-10 rounded-full bg-[#2A231C] border border-[#D9A441]/40"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1D1915] ${
                      bottomPlayer?.connected ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-[#FAF7F2]">
                    <span>{bottomPlayer?.name || 'You'}</span>
                    <span className="text-[10px] text-[#D9A441] font-bold">
                      {bottomColor === 'w' ? '♔' : '♚'}
                    </span>
                  </div>
                  <div className="text-xs text-[#9E9689]">{bottomPlayer?.rating || 1600}</div>
                </div>
              </div>
            </div>

            {/* Bottom Digital Clock Display */}
            <div
              className={`p-3.5 sm:p-4 rounded-xl border text-center transition-all duration-200 ${
                isBottomActive
                  ? 'bg-[#231E18] border-[#D9A441] shadow-lg shadow-[#D9A441]/10 ring-1 ring-[#D9A441]/50'
                  : 'bg-[#151311] border-[#2A241F]'
              }`}
            >
              <div
                className={`digital-clock-display text-2xl sm:text-3xl font-bold tracking-widest ${
                  isBottomActive ? 'text-[#F5C66A]' : 'text-[#FAF7F2]/80'
                }`}
              >
                {formatClock(bottomClockMs)}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive 2D/3D Chessboard (Desktop: 6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2 py-2">
          <Chessboard
            fen={roomState.fen}
            orientation={boardOrientation}
            myColor={myColor}
            interactive={roomState.status === 'IN_PROGRESS' && roomState.turn === myColor}
            lastMove={roomState.lastMove}
            onMove={onMove}
          />
        </div>

        {/* RIGHT COLUMN: Game Info, Move History & Actions (Desktop: 3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3">
          {/* Game Info & Time Control */}
          <div className="luxury-card p-4 rounded-xl border border-[#2A241F]">
            <div className="text-xs font-semibold text-[#9E9689] uppercase tracking-wider mb-2 font-['Cinzel']">
              Game Info
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#FAF7F2]">
                <Clock className="w-4 h-4 text-[#D9A441]" />
                <span>{roomState.timeControl.name}</span>
              </div>
              {materialDiff !== 0 && (
                <span className="text-xs font-mono font-bold text-[#F5C66A]">
                  {materialDiff > 0 ? `+${materialDiff}` : materialDiff}
                </span>
              )}
            </div>
          </div>

          {/* Move History Table */}
          <div className="luxury-card p-4 rounded-xl border border-[#2A241F] flex flex-col h-56 sm:h-64">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#9E9689] uppercase tracking-wider font-['Cinzel']">
                Move History
              </span>
              <span className="text-[11px] text-[#9E9689] font-mono">
                {roomState.history.length} moves
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              {movePairs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#9E9689]/60">
                  Game in progress...
                </div>
              ) : (
                movePairs.map((pair, idx) => {
                  const isLatest = idx === movePairs.length - 1;
                  return (
                    <div
                      key={pair.num}
                      className={`grid grid-cols-6 py-1 px-2 rounded ${
                        isLatest ? 'bg-[#2A231C]/60 text-[#F5C66A]' : 'text-[#FAF7F2]'
                      }`}
                    >
                      <span className="col-span-1 text-[#9E9689]">{pair.num}.</span>
                      <span className={`col-span-2 font-semibold ${isLatest && !pair.black ? 'text-[#F5C66A]' : ''}`}>
                        {pair.white || ''}
                      </span>
                      <span className={`col-span-2 font-semibold ${isLatest && pair.black ? 'text-[#F5C66A]' : ''}`}>
                        {pair.black || ''}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={moveHistoryEndRef} />
            </div>
          </div>

          {/* Match Action Controls (Offer Draw, Resign, Flip Board) */}
          <div className="space-y-2">
            <button
              onClick={onOfferDraw}
              disabled={roomState.status !== 'IN_PROGRESS'}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1D1915] border border-[#D9A441]/40 text-[#FAF7F2] text-xs font-semibold hover:border-[#F5C66A] hover:bg-[#2A231C] active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
            >
              <Handshake className="w-4 h-4 text-[#D9A441]" />
              <span>Offer Draw</span>
            </button>

            {showResignConfirm ? (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/50 space-y-2">
                <div className="text-xs text-red-200 text-center font-medium">
                  Confirm resignation?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowResignConfirm(false);
                      onResign();
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Yes, Resign
                  </button>
                  <button
                    onClick={() => setShowResignConfirm(false)}
                    className="flex-1 py-1.5 rounded-lg bg-[#2A231C] text-xs text-[#FAF7F2] hover:bg-[#382F26] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResignConfirm(true)}
                disabled={roomState.status !== 'IN_PROGRESS'}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2A1616] border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-900/30 hover:border-red-500/60 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
              >
                <Flag className="w-4 h-4 text-red-400" />
                <span>Resign</span>
              </button>
            )}

            <button
              onClick={flipBoard}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1D1915] border border-[#2A241F] text-[#FAF7F2] text-xs font-semibold hover:border-[#D9A441]/40 hover:bg-[#2A231C] active:scale-[0.99] transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4 text-[#9E9689]" />
              <span>Flip Board</span>
            </button>
          </div>

          {/* Sound & Settings Icons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2A241F]">
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-[#1D1915] border border-[#2A241F] text-[#FAF7F2] hover:border-[#D9A441]/40 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#9E9689]" /> : <Volume2 className="w-4 h-4 text-[#D9A441]" />}
            </button>

            <button
              onClick={() => setShowInfoModal(true)}
              className="p-2.5 rounded-xl bg-[#1D1915] border border-[#2A241F] text-[#FAF7F2] hover:border-[#D9A441]/40 transition-colors cursor-pointer"
              title="Tournament Info"
            >
              <Info className="w-4 h-4 text-[#9E9689]" />
            </button>
          </div>
        </div>
      </main>

      {/* Game Over Modal Overlay */}
      {roomState.result && (
        <GameOverModal
          result={roomState.result}
          myColor={myColor}
          pgn={roomState.pgn}
          totalMoves={roomState.history.length}
          onReturnToEntry={onExit}
        />
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="luxury-card-gold p-6 rounded-2xl max-w-sm w-full border border-[#D9A441]/40 bg-[#1D1915] text-left">
            <h3 className="font-['Cinzel'] text-lg font-bold text-[#F5C66A] mb-3">
              Tournament Match Info
            </h3>
            <div className="space-y-2 text-xs text-[#9E9689] mb-6">
              <div>
                <strong className="text-[#FAF7F2]">Room:</strong> #{roomState.roomId}
              </div>
              <div>
                <strong className="text-[#FAF7F2]">Time Control:</strong> {roomState.timeControl.name}
              </div>
              <div>
                <strong className="text-[#FAF7F2]">Engine:</strong> Authoritative server validation (chess.js)
              </div>
              <div>
                <strong className="text-[#FAF7F2]">Rule Set:</strong> Standard FIDE Rules (Castling, En Passant, 50-Move Rule, Threefold Repetition)
              </div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 rounded-xl bg-[#2A231C] border border-[#D9A441]/30 text-xs font-semibold text-[#FAF7F2] hover:bg-[#382F26] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
