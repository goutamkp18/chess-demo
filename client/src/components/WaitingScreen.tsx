import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, Copy, Check, Users } from 'lucide-react';
import type { PlayerProfile, TimeControl } from '../types/index';
import { ChessPiece } from '../chess/ChessPiece';

interface WaitingScreenProps {
  roomId: string;
  player: PlayerProfile;
  waitingDeadline: number | null;
  timeControl: TimeControl;
  onCancel: () => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
  roomId,
  player,
  waitingDeadline,
  timeControl,
  onCancel,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [copied, setCopied] = useState<boolean>(false);

  // Authoritative server deadline synchronization
  useEffect(() => {
    if (!waitingDeadline) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((waitingDeadline - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [waitingDeadline]);

  const copyRoomInvite = () => {
    const inviteUrl = `${window.location.origin}?roomId=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage for radial/progress indicator
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 60) * 100));

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="luxury-card-gold p-6 sm:p-10 rounded-2xl max-w-lg w-full border border-[#D9A441]/40 bg-[#1D1915] text-center shadow-2xl relative">
        {/* Subtle glowing halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#D9A441]/10 blur-3xl pointer-events-none" />

        {/* Room Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A231C] border border-[#D9A441]/30 text-xs font-semibold text-[#D9A441] mb-6">
          <span>ROOM #{roomId}</span>
          <span>•</span>
          <span>{timeControl.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Player Status Display */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#161311] border border-[#2A241F] mb-6 text-left">
          <div className="flex items-center gap-3">
            <img
              src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`}
              alt={player.name}
              className="w-12 h-12 rounded-full border-2 border-[#D9A441]/50 bg-[#2A231C]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-[#FAF7F2]">{player.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D9A441]/20 text-[#F5C66A] font-bold">
                  WHITE
                </span>
              </div>
              <div className="text-xs text-[#9E9689] flex items-center gap-2 mt-0.5">
                <span>Rating: {player.rating || 1600}</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                </span>
              </div>
            </div>
          </div>
          <div className="w-9 h-9">
            <ChessPiece type="k" color="w" size={36} />
          </div>
        </div>

        {/* Opponent Status Waiting Box */}
        <div className="p-4 rounded-xl bg-[#161311]/60 border border-dashed border-[#D9A441]/30 mb-8">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#D9A441] uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 animate-pulse" />
            <span>Opponent Not Connected</span>
          </div>
          <p className="text-sm text-[#FAF7F2]/80 font-['Outfit'] mb-4">
            Waiting for your opponent to enter the arena...
          </p>

          {/* Synchronized 60-Second Countdown */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-[#2A241F]"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-[#D9A441] transition-all duration-500 ease-linear"
                  strokeWidth="6"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-['JetBrains_Mono'] text-2xl font-bold tracking-tight text-[#FAF7F2]">
                  {formattedTime}
                </span>
                <span className="text-[10px] text-[#9E9689] uppercase tracking-widest">
                  Remaining
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#9E9689] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#F5C66A]" />
              <span>Walkover victory awarded if opponent fails to connect.</span>
            </div>
          </div>
        </div>

        {/* Invite & Cancel Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={copyRoomInvite}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2A231C] border border-[#D9A441]/40 text-[#FAF7F2] text-xs font-semibold hover:border-[#F5C66A] hover:bg-[#382F26] transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#D9A441]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Tournament Link'}</span>
          </button>

          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-transparent border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/10 hover:border-red-500/50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
