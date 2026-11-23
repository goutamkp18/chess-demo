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
      colors: ['#E8C27A', '#C6A15B', '#FAF7F2', '#F5D898'],
    });
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="luxury-card-gold p-8 sm:p-12 rounded-2xl max-w-lg w-full border border-[#E8C27A]/30 bg-[#161617] text-center shadow-2xl relative overflow-hidden">
        {/* Glow halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-[#E8C27A]/15 blur-3xl pointer-events-none" />

        {/* Room Header */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1C1C1E] border border-[#E8C27A]/30 text-xs font-semibold text-[#E8C27A] mb-6 font-condensed uppercase tracking-wider">
          <span>ROOM #{roomId}</span>
          <span>•</span>
          <span>MATCH CONCLUDED</span>
        </div>

        {/* Golden Trophy */}
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-[#1C1C1E] border border-[#E8C27A]/50 mb-6 shadow-xl text-[#E8C27A]">
          <Trophy className="w-10 h-10 text-[#E8C27A] animate-bounce" />
        </div>

        <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold tracking-wider text-gold-gradient uppercase mb-2">
          VICTORY!
        </h1>

        <p className="text-xs sm:text-sm text-[#A1A1AA] mb-6">
          Opponent failed to join within the allowed 60 seconds.
        </p>

        {/* Result Card */}
        <div className="p-4 rounded-xl bg-[#131314] border border-[#262628] mb-8">
          <div className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-condensed mb-1">
            OFFICIAL TOURNAMENT RULING
          </div>
          <div className="text-xl font-bold font-condensed text-[#FAF7F2] tracking-wider mb-2 uppercase">
            RESULT: WIN BY WALKOVER
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Winner declared: {playerName} (Authoritatively Recorded)</span>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={onReturnToEntry}
          className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-condensed tracking-wider uppercase text-base shadow-xl active:scale-[0.99] transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          RETURN TO MATCH ENTRY
        </button>
      </div>
    </div>
  );
};
