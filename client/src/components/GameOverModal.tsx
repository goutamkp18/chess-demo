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
        colors: ['#E8C27A', '#C6A15B', '#FAF7F2', '#F5D898'],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="luxury-card-gold p-6 sm:p-8 rounded-2xl max-w-md w-full border border-[#E8C27A]/30 bg-[#161617] text-center shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#E8C27A]/10 blur-2xl pointer-events-none" />

        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-[#1C1C1E] border border-[#E8C27A]/40 mb-4 shadow-lg text-[#E8C27A]">
          {isWinner ? (
            <Trophy className="w-8 h-8 text-[#E8C27A] animate-bounce" />
          ) : isDraw ? (
            <Award className="w-8 h-8 text-[#E8C27A]" />
          ) : (
            <Flag className="w-8 h-8 text-rose-400" />
          )}
        </div>

        {/* Title */}
        <h2 className="font-condensed text-3xl sm:text-4xl font-extrabold tracking-wider mb-1 text-[#FAF7F2] uppercase">
          {isWinner ? (
            <span className="text-gold-gradient">VICTORY</span>
          ) : isDraw ? (
            <span className="text-[#FAF7F2]">DRAW</span>
          ) : (
            <span className="text-[#A1A1AA]">DEFEAT</span>
          )}
        </h2>

        {/* Reason pill */}
        <div className="inline-block px-3.5 py-1 rounded-full bg-[#1C1C1E] border border-[#E8C27A]/30 text-xs font-semibold text-[#E8C27A] mb-4 font-condensed tracking-wider uppercase">
          {getReasonLabel(result.reason)}
        </div>

        <p className="text-xs sm:text-sm text-[#A1A1AA] mb-6">
          {result.message}
        </p>

        {/* Match Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="p-3.5 rounded-xl bg-[#131314] border border-[#262628]">
            <div className="text-[11px] text-[#A1A1AA] font-condensed uppercase tracking-wider">Total Moves</div>
            <div className="text-lg font-semibold text-[#FAF7F2] font-mono">{totalMoves}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#131314] border border-[#262628]">
            <div className="text-[11px] text-[#A1A1AA] font-condensed uppercase tracking-wider">Winner</div>
            <div className="text-lg font-semibold text-[#E8C27A] capitalize font-condensed tracking-wide">
              {result.winner}
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onReturnToEntry}
          className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-condensed tracking-wider uppercase text-sm shadow-xl active:scale-[0.99] transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          RETURN TO MATCH ENTRY
        </button>
      </div>
    </div>
  );
};
