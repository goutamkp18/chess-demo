import React, { useState } from 'react';
import { ExternalLink, Swords, Copy, Check, Key, Shield } from 'lucide-react';
import { getChessArenaMatchInfo } from '../utils/chessArenaHelper';
import { useAuth } from '../context/AuthContext';

export const ChessArenaButton = ({ game, tournament, round, variant = 'compact' }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const arenaInfo = getChessArenaMatchInfo(game, tournament, round);

  // Check if current user is one of the players
  const currentUserName = user?.player?.full_name || user?.full_name || '';
  const isWhite = currentUserName && game?.white_player_name?.toLowerCase() === currentUserName.toLowerCase();
  const isBlack = currentUserName && game?.black_player_name?.toLowerCase() === currentUserName.toLowerCase();

  const defaultPlayerName = isWhite
    ? game?.white_player_name
    : isBlack
    ? game?.black_player_name
    : currentUserName || game?.white_player_name || 'Player';

  const defaultRating = isWhite
    ? game?.white_player_rating
    : isBlack
    ? game?.black_player_rating
    : 1600;

  const handleLaunch = (playerName = defaultPlayerName, rating = defaultRating) => {
    arenaInfo.launchInNewWindow(playerName, rating);
  };

  const handleCopyCredentials = (e) => {
    e.stopPropagation();
    const text = `Chess Arena Room: ${arenaInfo.roomId}\nPassword: ${arenaInfo.password}\nLink: ${arenaInfo.getLaunchUrl(defaultPlayerName, defaultRating)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'banner') {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#221c13] via-[#1a1713] to-[#121110] border border-[#D9A441]/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 border border-[#D9A441]/50 flex items-center justify-center text-[#F5C66A]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#2a2214] text-[#F5C66A] border border-[#D9A441]/30">
                Board {game?.board_no || '1'}
              </span>
              <span className="text-xs text-zinc-300 font-semibold">
                {game?.white_player_name} vs {game?.black_player_name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
              <span>Room: <strong className="text-white font-mono">{arenaInfo.roomId}</strong></span>
              <span>•</span>
              <span>Pass: <strong className="text-white font-mono">{arenaInfo.password}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCredentials}
            title="Copy Credentials"
            className="px-2.5 py-1.5 rounded-lg bg-[#24201a] border border-[#3d3323] text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D9A441]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => handleLaunch()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9A441] to-[#b38222] hover:brightness-110 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#D9A441]/20 active:scale-95 transition-all cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Play in Chess Arena</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleLaunch()}
          title="Open Match in Chess Arena (New Window)"
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D9A441] to-[#b38222] hover:brightness-110 text-black font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-[#D9A441]/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <Swords className="w-3 h-3" />
          <span>Chess Arena</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          title="View Room ID & Password"
          className="p-1 rounded-lg bg-[#262626] hover:bg-[#333] text-zinc-400 hover:text-white border border-[#383838] transition-colors cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-[#D9A441]" />
        </button>
      </div>

      {showDetails && (
        <div className="mt-1 p-2 rounded-lg bg-[#181614] border border-[#D9A441]/30 text-left text-[10px] space-y-1 shadow-xl z-20">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Room:</span>
            <span className="font-mono text-[#F5C66A] font-bold">{arenaInfo.roomId}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Pass:</span>
            <span className="font-mono text-zinc-200">{arenaInfo.password}</span>
          </div>
          <div className="pt-1 flex items-center justify-between border-t border-zinc-800">
            <button
              onClick={handleCopyCredentials}
              className="text-[#D9A441] hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Credentials'}</span>
            </button>
            <button
              onClick={() => handleLaunch()}
              className="text-white hover:text-[#F5C66A] flex items-center gap-0.5 ml-2 font-semibold"
            >
              <span>Launch</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessArenaButton;
