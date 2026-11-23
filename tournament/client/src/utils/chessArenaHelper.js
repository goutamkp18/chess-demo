// Helper to integrate Tournament Matches with Chess Arena
export const getChessArenaMatchInfo = (game, tournament = null, round = null) => {
  const tId = tournament?.tournament_id || game?.tournament_id || '1';
  const rNo = round?.round_no || game?.round_no || '1';
  const boardNo = game?.board_no || '1';
  const gameId = game?.game_id || `${tId}_${rNo}_${boardNo}`;

  // Deterministic, matching Room ID and Password for both opponents
  const roomId = `TOUR-T${tId}-R${rNo}-B${boardNo}`;
  const password = `arena-${tId}-${rNo}-${boardNo}`;

  const arenaBaseUrl = import.meta.env.VITE_CHESS_ARENA_URL || 'http://localhost:5173';

  const getLaunchUrl = (playerName = '', rating = 1600) => {
    const params = new URLSearchParams({
      roomId,
      password,
      player: playerName || 'Player',
      rating: String(rating || 1600),
      autoJoin: 'true',
    });
    return `${arenaBaseUrl}/?${params.toString()}`;
  };

  const launchInNewWindow = (playerName = '', rating = 1600) => {
    const url = getLaunchUrl(playerName, rating);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return {
    roomId,
    password,
    arenaBaseUrl,
    getLaunchUrl,
    launchInNewWindow,
  };
};
