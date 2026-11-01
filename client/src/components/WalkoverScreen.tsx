import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ShieldCheck, RotateCcw } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface WalkoverScreenProps {
  roomId: string;
  playerName: string;
  onReturnToEntry: () => void;
}

export const WalkoverScreen: React.FC<WalkoverScreenProps> = ({
  roomId,
  playerName,
  onReturnToEntry,
}) => {
  useEffect(() => {
    soundManager.playVictory();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D9A441', '#F5C66A', '#FAF7F2'],
    });
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="luxury-card-gold p-8 sm:p-12 rounded-2xl max-w-lg w-full border border-[#D9A441]/50 bg-[#1D1915] text-center shadow-2xl relative overflow-hidden">
        {/* Glow halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#D9A441]/15 blur-3xl pointer-events-none" />

        {/* Room Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A231C] border border-[#D9A441]/30 text-xs font-semibold text-[#D9A441] mb-6">
          <span>ROOM #{roomId}</span>
          <span>•</span>
          <span>MATCH CONCLUDED</span>
        </div>

        {/* Golden Trophy */}
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-radial from-[#D9A441]/25 to-transparent border border-[#D9A441]/50 mb-6 shadow-xl">
          <Trophy className="w-10 h-10 text-[#F5C66A] animate-bounce" />
        </div>

        <h1 className="font-['Cinzel'] text-3xl sm:text-4xl font-extrabold tracking-wider text-[#F5C66A] mb-2">
          VICTORY!
        </h1>

        <p className="text-sm sm:text-base text-[#FAF7F2] font-['Outfit'] mb-6">
          Opponent failed to join within the allowed 60 seconds.
        </p>

        {/* Result Card */}
        <div className="p-4 rounded-xl bg-[#161311] border border-[#D9A441]/30 mb-8">
          <div className="text-[11px] font-semibold text-[#9E9689] uppercase tracking-widest mb-1">
            OFFICIAL TOURNAMENT RULING
          </div>
          <div className="text-xl font-bold font-['Cinzel'] text-[#FAF7F2] tracking-wider mb-2">
            RESULT: WIN BY WALKOVER
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Winner declared: {playerName} (Recorded Authoritatively)</span>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={onReturnToEntry}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#D9A441] to-[#B37D22] text-[#0B0B0D] font-bold text-sm tracking-wide shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer font-['Cinzel']"
        >
          <RotateCcw className="w-4 h-4" />
          RETURN TO MATCH ENTRY
        </button>
      </div>
    </div>
  );
};
