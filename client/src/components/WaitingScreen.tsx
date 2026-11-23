import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, Copy, Check, Users } from 'lucide-react';
import type { PlayerProfile, TimeControl } from '../types/index';
import { ChessPiece } from '../chess/ChessPiece';
import { socketService } from '../services/socket';

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

  // Periodic sync pulse to guarantee immediate transition when opponent enters
  useEffect(() => {
    const pulse = setInterval(() => {
      socketService.requestSync(roomId);
    }, 1500);

    return () => clearInterval(pulse);
  }, [roomId]);

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
      <div className="luxury-card-gold p-6 sm:p-10 rounded-2xl max-w-lg w-full border border-[#E8C27A]/25 bg-[#161617] text-center shadow-2xl relative">
        {/* Subtle glowing halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-[#E8C27A]/10 blur-3xl pointer-events-none" />

        {/* Room Header Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1C1C1E] border border-[#E8C27A]/30 text-xs font-semibold text-[#E8C27A] mb-6">
          <span>ROOM #{roomId}</span>
          <span>•</span>
          <span>{timeControl.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Player Status Display */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#131314] border border-[#262628] mb-6 text-left">
          <div className="flex items-center gap-3">
            <img
              src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`}
              alt={player.name}
              className="w-12 h-12 rounded-full border-2 border-[#E8C27A]/40 bg-[#1C1C1E]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-[#FAF7F2]">{player.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8C27A]/15 text-[#E8C27A] border border-[#E8C27A]/30 font-bold uppercase">
                  WHITE
                </span>
              </div>
              <div className="text-xs text-[#A1A1AA] flex items-center gap-2 mt-0.5">
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
        <div className="p-5 rounded-2xl bg-[#131314] border border-[#262628] mb-7">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#E8C27A] uppercase tracking-wider mb-2 font-condensed">
            <Users className="w-4 h-4 animate-pulse text-[#E8C27A]" />
            <span>Opponent Not Connected</span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mb-4">
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
                  className="stroke-[#262628]"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-[#E8C27A] transition-all duration-500 ease-linear"
                  strokeWidth="5"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-bold tracking-tight text-[#FAF7F2]">
                  {formattedTime}
                </span>
                <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-condensed">
                  Remaining
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5 mt-2">
              <ShieldAlert className="w-3.5 h-3.5 text-[#E8C27A]" />
              <span>Walkover victory awarded if opponent fails to connect.</span>
            </div>
          </div>
        </div>

        {/* Invite & Cancel Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={copyRoomInvite}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1C1C1E] border border-[#2E2E30] text-[#E4E4E7] text-xs font-semibold hover:border-[#E8C27A]/40 hover:text-[#FAF7F2] transition-all cursor-pointer font-condensed uppercase tracking-wider"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#E8C27A]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Tournament Link'}</span>
          </button>

          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition-all cursor-pointer font-condensed uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
