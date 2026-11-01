import React from 'react';
import { CheckCircle2, Loader2, Play, WifiOff } from 'lucide-react';
import type { PlayerProfile, TimeControl, PlayerColor } from '../types/index';
import { ChessPiece } from '../chess/ChessPiece';
import { soundManager } from '../utils/sound';

interface ReadyConfirmationProps {
  roomId: string;
  whitePlayer: PlayerProfile | null;
  blackPlayer: PlayerProfile | null;
  myId: string;
  myColor: PlayerColor;
  timeControl: TimeControl;
  onConfirmReady: () => void;
}

export const ReadyConfirmation: React.FC<ReadyConfirmationProps> = ({
  roomId,
  whitePlayer,
  blackPlayer,
  myId,
  myColor,
  timeControl,
  onConfirmReady,
}) => {
  const isMeReady =
    myColor === 'w' ? !!whitePlayer?.isReady : !!blackPlayer?.isReady;

  const handleReadyClick = () => {
    if (!isMeReady) {
      soundManager.playClick();
      onConfirmReady();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="luxury-card-gold p-6 sm:p-10 rounded-2xl max-w-2xl w-full border border-[#D9A441]/40 bg-[#1D1915] text-center shadow-2xl relative">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 bg-[#D9A441]/10 blur-3xl pointer-events-none" />

        {/* Room Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A231C] border border-[#D9A441]/30 text-xs font-semibold text-[#D9A441] mb-2">
          <span>ROOM #{roomId}</span>
          <span>•</span>
          <span>{timeControl.name}</span>
        </div>

        <h2 className="font-['Cinzel'] text-2xl font-bold tracking-wider text-[#FAF7F2] mb-1">
          MATCH ASSEMBLED
        </h2>
        <p className="text-xs text-[#9E9689] mb-8 font-['Outfit']">
          Both Grandmasters have arrived. Confirm your readiness to initiate the tournament clocks.
        </p>

        {/* 2-Player Versus Arena Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* WHITE PLAYER CARD */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden ${
              whitePlayer?.isReady
                ? 'bg-[#18241B] border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                : 'bg-[#161311] border-[#2A241F]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9A441] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FAF7F2] border border-[#2A241F]" />
                White Player
              </span>
              <div className="w-8 h-8">
                <ChessPiece type="k" color="w" size={32} />
              </div>
            </div>

            {whitePlayer ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={whitePlayer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(whitePlayer.name)}`}
                    alt={whitePlayer.name}
                    className="w-12 h-12 rounded-full border-2 border-[#D9A441]/40 bg-[#2A231C]"
                  />
                  <div>
                    <div className="font-semibold text-sm text-[#FAF7F2] flex items-center gap-1.5">
                      {whitePlayer.name}
                      {myId === whitePlayer.id && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D9A441]/30 text-[#F5C66A]">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9E9689]">
                      Rating: {whitePlayer.rating || 1600}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2A241F] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    {whitePlayer.connected ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">Reconnecting...</span>
                      </>
                    )}
                  </div>

                  {whitePlayer.isReady ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" /> READY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2A231C] text-[#9E9689] text-xs font-medium border border-[#3A332B]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A441]" /> NOT READY
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#9E9689]">Waiting for player...</div>
            )}
          </div>

          {/* BLACK PLAYER CARD */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden ${
              blackPlayer?.isReady
                ? 'bg-[#18241B] border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                : 'bg-[#161311] border-[#2A241F]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9A441] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#181513] border border-[#D9A441]/40" />
                Black Player
              </span>
              <div className="w-8 h-8">
                <ChessPiece type="k" color="b" size={32} />
              </div>
            </div>

            {blackPlayer ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={blackPlayer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(blackPlayer.name)}`}
                    alt={blackPlayer.name}
                    className="w-12 h-12 rounded-full border-2 border-[#D9A441]/40 bg-[#2A231C]"
                  />
                  <div>
                    <div className="font-semibold text-sm text-[#FAF7F2] flex items-center gap-1.5">
                      {blackPlayer.name}
                      {myId === blackPlayer.id && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D9A441]/30 text-[#F5C66A]">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9E9689]">
                      Rating: {blackPlayer.rating || 1600}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2A241F] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    {blackPlayer.connected ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">Reconnecting...</span>
                      </>
                    )}
                  </div>

                  {blackPlayer.isReady ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" /> READY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2A231C] text-[#9E9689] text-xs font-medium border border-[#3A332B]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A441]" /> NOT READY
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#9E9689]">Waiting for player...</div>
            )}
          </div>
        </div>

        {/* Action Button: CONFIRM READY */}
        <div className="max-w-xs mx-auto">
          {isMeReady ? (
            <div className="py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold text-sm tracking-wide flex items-center justify-center gap-2 font-['Cinzel'] animate-pulse">
              <CheckCircle2 className="w-5 h-5" />
              <span>YOU ARE READY. WAITING FOR OPPONENT...</span>
            </div>
          ) : (
            <button
              onClick={handleReadyClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#D9A441] to-[#B37D22] text-[#0B0B0D] font-bold text-sm tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer font-['Cinzel']"
            >
              <Play className="w-4 h-4 fill-current" />
              CONFIRM READY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
