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
      const urlPassword = params.get('password') || params.get('pass') || params.get('pwd');
      const urlPlayer = params.get('player') || params.get('name');
      const urlRating = params.get('rating');
      const autoJoin = params.get('autoJoin') === 'true' || params.get('auto') === 'true';

      const finalRoom = urlRoomId ? urlRoomId.trim() : '';
      const finalPass = urlPassword ? urlPassword.trim() : '';
      const finalPlayer = urlPlayer ? urlPlayer.trim() : '';
      const finalRating = urlRating && !isNaN(Number(urlRating)) ? Number(urlRating) : 1600;

      if (finalRoom) setRoomId(finalRoom);
      if (finalPass) setPassword(finalPass);
      if (finalPlayer) setPlayerName(finalPlayer);
      if (finalRating) setRating(finalRating);

      // Automatic seamless join when redirected from Tournament website
      if (autoJoin && finalRoom && finalPass && finalPlayer) {
        setLoading(true);
        soundManager.playClick();
        onJoin({
          roomId: finalRoom.toUpperCase(),
          password: finalPass,
          playerName: finalPlayer,
          rating: finalRating,
          timeControl: TIME_CONTROLS[0],
        }).then((res) => {
          setLoading(false);
          if (!res.success) {
            setErrorMessage(res.error || 'Failed to authenticate tournament match.');
          }
        });
      }
    }
  }, [onJoin]);

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
    <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#E8C27A]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#C9993F]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Entry Card */}
      <div className="luxury-card-gold p-6 sm:p-10 rounded-3xl max-w-md w-full border border-[#E8C27A]/25 bg-[#161617]/95 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Top Regal Branding Header */}
        <div className="text-center mb-7">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8C27A] via-[#D8AD56] to-[#C9993F] flex items-center justify-center shadow-lg shadow-[#C9993F]/20 mb-3 border border-[#F5D898]/40 transform -rotate-2 hover:rotate-0 transition-transform">
            <Crown className="w-8 h-8 text-[#111111] fill-current" />
          </div>

          <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold tracking-wider text-gold-gradient uppercase mb-1">
            CHESS ARENA
          </h1>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[#E8C27A] tracking-widest uppercase font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#E8C27A]" />
            <span>Championship Multiplayer</span>
            <Sparkles className="w-3.5 h-3.5 text-[#E8C27A]" />
          </div>

          <p className="text-xs text-[#A1A1AA] mt-2.5">
            Enter your tournament match credentials below to join your assigned board.
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room ID Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C27A] mb-1.5 font-condensed">
              Room ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="e.g. ROOM-101"
                required
                className="w-full py-2.5 px-3.5 rounded-xl bg-[#131314] border border-[#262628] focus:border-[#E8C27A] focus:ring-1 focus:ring-[#E8C27A] text-[#FAF7F2] font-mono text-sm placeholder:text-[#71717A] outline-none transition-all uppercase"
              />
            </div>
          </div>

          {/* Room Password Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C27A] mb-1.5 font-condensed">
              Room Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full py-2.5 px-3.5 rounded-xl bg-[#131314] border border-[#262628] focus:border-[#E8C27A] focus:ring-1 focus:ring-[#E8C27A] text-[#FAF7F2] text-sm placeholder:text-[#71717A] outline-none transition-all"
              />
            </div>
          </div>

          {/* Player Name / Handle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C27A] mb-1.5 font-condensed">
              Player Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Grandmaster Aarav"
                required
                className="w-full py-2.5 px-3.5 rounded-xl bg-[#131314] border border-[#262628] focus:border-[#E8C27A] focus:ring-1 focus:ring-[#E8C27A] text-[#FAF7F2] text-sm placeholder:text-[#71717A] outline-none transition-all"
              />
            </div>
          </div>

          {/* Time Control Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C27A] mb-1.5 font-condensed flex items-center justify-between">
              <span>Time Control</span>
              <span className="text-[10px] text-[#A1A1AA] lowercase font-normal">(if creating room)</span>
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
                        ? 'bg-[#1C1C1E] border-[#E8C27A] text-[#E8C27A] shadow-sm'
                        : 'bg-[#131314] border-[#262628] text-[#A1A1AA] hover:border-[#38383A] hover:text-[#FAF7F2]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-[#E8C27A]" />
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
              className="btn-gold w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-condensed tracking-wider uppercase text-base shadow-xl disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
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
        <div className="mt-7 pt-4 border-t border-[#262628] flex items-center justify-between text-[11px] text-[#A1A1AA]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
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
