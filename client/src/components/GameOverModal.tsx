import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Flag, Award, RotateCcw } from 'lucide-react';
import type { MatchResult, PlayerColor } from '../types/index';
import { soundManager } from '../utils/sound';

interface GameOverModalProps {
  result: MatchResult;
  myColor: PlayerColor;
  totalMoves: number;
  onReturnToEntry: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  result,
  myColor,
  totalMoves,
  onReturnToEntry,
}) => {
  const isDraw = result.winner === 'draw';
  const isWinner =
    (result.winner === 'white' && myColor === 'w') ||
    (result.winner === 'black' && myColor === 'b');

  useEffect(() => {
    if (isWinner) {
      soundManager.playVictory();
      // Confetti burst
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D9A441', '#F5C66A', '#FAF7F2', '#E8D9C0'],
      });
    }
  }, [isWinner]);

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'checkmate':
        return 'Checkmate';
      case 'walkover':
        return 'Win by Walkover';
      case 'resignation':
        return 'Opponent Resigned';
      case 'timeout':
        return 'Time Forfeit';
      case 'stalemate':
        return 'Stalemate';
      case 'threefold_repetition':
        return 'Threefold Repetition';
      case 'fifty_move_rule':
        return '50-Move Rule';
      case 'insufficient_material':
        return 'Insufficient Material';
      case 'mutual_agreement':
        return 'Mutual Agreement';
      default:
        return reason;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="luxury-card-gold p-6 sm:p-8 rounded-2xl max-w-md w-full border border-[#D9A441]/50 bg-[#1D1915] text-center shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#D9A441]/10 blur-2xl pointer-events-none" />

        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-radial from-[#D9A441]/20 to-transparent border border-[#D9A441]/40 mb-4 shadow-lg">
          {isWinner ? (
            <Trophy className="w-8 h-8 text-[#F5C66A] animate-bounce" />
          ) : isDraw ? (
            <Award className="w-8 h-8 text-[#9E9689]" />
          ) : (
            <Flag className="w-8 h-8 text-red-400" />
          )}
        </div>

        {/* Title */}
        <h2 className="font-['Cinzel'] text-2xl sm:text-3xl font-bold tracking-wider mb-1 text-[#FAF7F2]">
          {isWinner ? (
            <span className="text-[#F5C66A]">VICTORY</span>
          ) : isDraw ? (
            <span className="text-[#FAF7F2]">DRAW</span>
          ) : (
            <span className="text-[#9E9689]">DEFEAT</span>
          )}
        </h2>

        {/* Reason pill */}
        <div className="inline-block px-3 py-1 rounded-full bg-[#2A231C] border border-[#D9A441]/30 text-xs font-medium text-[#D9A441] mb-4">
          {getReasonLabel(result.reason)}
        </div>

        <p className="text-sm text-[#FAF7F2]/90 mb-6 font-['Outfit']">
          {result.message}
        </p>

        {/* Match Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="p-3 rounded-xl bg-[#161311] border border-[#2A241F]">
            <div className="text-[11px] text-[#9E9689]">Total Moves</div>
            <div className="text-lg font-semibold text-[#FAF7F2] font-mono">{totalMoves}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#161311] border border-[#2A241F]">
            <div className="text-[11px] text-[#9E9689]">Winner</div>
            <div className="text-lg font-semibold text-[#F5C66A] capitalize">
              {result.winner}
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onReturnToEntry}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D9A441] to-[#B37D22] text-[#0B0B0D] font-bold text-sm tracking-wide shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer font-['Cinzel']"
        >
          <RotateCcw className="w-4 h-4" />
          RETURN TO MATCH ENTRY
        </button>
      </div>
    </div>
  );
};
