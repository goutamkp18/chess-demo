import React, { useState, useEffect } from 'react';
import { Crown, ShieldCheck, Play, Sparkles, AlertCircle, Clock } from 'lucide-react';
import type { TimeControl } from '../types/index';
import { soundManager } from '../utils/sound';

interface MatchEntryProps {
  onJoin: (params: {
    roomId: string;
    password: string;
    playerName: string;
    rating: number;
    timeControl: TimeControl;
  }) => Promise<{ success: boolean; error?: string }>;
}

const TIME_CONTROLS: TimeControl[] = [
  { initialSeconds: 600, incrementSeconds: 5, name: '10 + 5 Blitz' },
  { initialSeconds: 300, incrementSeconds: 0, name: '5 + 0 Blitz' },
  { initialSeconds: 180, incrementSeconds: 0, name: '3 + 0 Blitz' },
  { initialSeconds: 900, incrementSeconds: 10, name: '15 + 10 Rapid' },
];

export const MatchEntry: React.FC<MatchEntryProps> = ({ onJoin }) => {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [rating, setRating] = useState(1600);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL integration readiness: inspect URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoomId = params.get('roomId') || params.get('room');
      const urlPlayer = params.get('player') || params.get('name');
      const urlRating = params.get('rating');

      if (urlRoomId) setRoomId(urlRoomId.trim());
      if (urlPlayer) setPlayerName(urlPlayer.trim());
      if (urlRating && !isNaN(Number(urlRating))) setRating(Number(urlRating));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!roomId.trim()) {
      setErrorMessage('Please enter a valid Room ID.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter the Room Password.');
      return;
    }

    if (!playerName.trim()) {
      setErrorMessage('Please enter your Player Name or Tournament Handle.');
      return;
    }

    setLoading(true);
    soundManager.playClick();

    const res = await onJoin({
      roomId: roomId.trim().toUpperCase(),
      password: password.trim(),
      playerName: playerName.trim(),
      rating: Number(rating) || 1600,
      timeControl: selectedTimeControl,
    });

    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to authenticate and join match.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D9A441]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#7A4725]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Entry Card */}
      <div className="luxury-card-gold p-6 sm:p-10 rounded-3xl max-w-md w-full border border-[#D9A441]/35 bg-[#1D1915]/95 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Top Regal Branding Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D9A441] to-[#996B1E] flex items-center justify-center shadow-xl shadow-[#D9A441]/20 mb-4 border border-[#F5C66A]/40 transform -rotate-3 hover:rotate-0 transition-transform">
            <Crown className="w-9 h-9 text-[#0B0B0D] fill-current" />
          </div>

          <h1 className="font-['Cinzel'] text-3xl sm:text-4xl font-extrabold tracking-wider text-[#FAF7F2] mb-1">
            CHESS ARENA
          </h1>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[#D9A441] tracking-widest uppercase font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Championship Multiplayer</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <p className="text-xs text-[#9E9689] mt-3 font-['Outfit']">
            Enter your tournament match credentials below to join your assigned board.
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room ID Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#D9A441] mb-1.5 font-['Cinzel']">
              Room ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="e.g. ROOM-101"
                required
                className="w-full py-3 px-4 rounded-xl bg-[#161311] border border-[#2A241F] focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-[#FAF7F2] font-mono text-sm placeholder:text-[#9E9689]/40 outline-none transition-all uppercase"
              />
            </div>
          </div>

          {/* Room Password Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#D9A441] mb-1.5 font-['Cinzel']">
              Room Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full py-3 px-4 rounded-xl bg-[#161311] border border-[#2A241F] focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-[#FAF7F2] text-sm placeholder:text-[#9E9689]/40 outline-none transition-all"
              />
            </div>
          </div>

          {/* Player Name / Handle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#D9A441] mb-1.5 font-['Cinzel']">
              Player Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Grandmaster Aarav"
                required
                className="w-full py-3 px-4 rounded-xl bg-[#161311] border border-[#2A241F] focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-[#FAF7F2] text-sm placeholder:text-[#9E9689]/40 outline-none transition-all"
              />
            </div>
          </div>

          {/* Time Control Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#D9A441] mb-1.5 font-['Cinzel'] flex items-center justify-between">
              <span>Time Control</span>
              <span className="text-[10px] text-[#9E9689] lowercase font-normal">(if creating room)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_CONTROLS.map((tc) => {
                const isSelected = selectedTimeControl.name === tc.name;
                return (
                  <button
                    type="button"
                    key={tc.name}
                    onClick={() => setSelectedTimeControl(tc)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2A231C] border-[#D9A441] text-[#F5C66A] shadow-sm'
                        : 'bg-[#161311] border-[#2A241F] text-[#9E9689] hover:border-[#3D342B]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>{tc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Join Match Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#D9A441] to-[#B37D22] text-[#0B0B0D] font-bold text-sm tracking-widest shadow-xl shadow-[#D9A441]/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer font-['Cinzel']"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0B0B0D] border-t-transparent rounded-full animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>JOIN MATCH</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security & System Status */}
        <div className="mt-8 pt-4 border-t border-[#2A241F] flex items-center justify-between text-[11px] text-[#9E9689]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authoritative Engine</span>
          </div>
          <div>
            <span>60s Walkover Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
