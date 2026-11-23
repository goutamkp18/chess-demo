import api from './axios';
import { supabase } from '../supabase';

// =========================================================================
// AUTHENTICATION & PROFILE APIS
// =========================================================================
export const checkUsernameApi = async (username) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('username', (username || '').trim())
        .maybeSingle();
      if (!error) {
        return { available: !data, message: data ? 'Username already taken' : 'Username available' };
      }
    } catch {
      // Continue to local API fallback
    }
  }
  try {
    const { data } = await api.get('/auth/check-username', { params: { username }, timeout: 2500 });
    return data;
  } catch {
    return { available: true };
  }
};

export const checkEmailApi = async (email) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('email', (email || '').trim().toLowerCase())
        .maybeSingle();
      if (!error) {
        return { available: !data, message: data ? 'Email already registered' : 'Email available' };
      }
    } catch {
      // Continue to local API fallback
    }
  }
  try {
    const { data } = await api.get('/auth/check-email', { params: { email }, timeout: 2500 });
    return data;
  } catch {
    return { available: true };
  }
};

export const loginApi = async (emailOrUsername, password, rememberMe = false) => {
  const { data } = await api.post('/auth/login', {
    email: emailOrUsername,
    username: emailOrUsername,
    identifier: emailOrUsername,
    password,
    remember_me: rememberMe
  });
  return data;
};

export const registerApi = async (registrationData) => {
  try {
    const { data } = await api.post('/auth/register', registrationData);
    return data;
  } catch (err) {
    // If local server is not active, return success representation so Supabase auth handles it
    return { token: null, message: 'Registration submitted' };
  }
};

export const verifyEmailApi = async (token) => {
  const { data } = await api.post('/auth/verify-email', { token });
  return data;
};

export const resendVerificationApi = async (email) => {
  try {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  } catch {
    return { message: 'Verification link resent' };
  }
};

export const googleAuthApi = async ({ id_token, role }) => {
  const { data } = await api.post('/auth/google', { id_token, role });
  return data;
};

export const forgotPasswordApi = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
};

export const resetPasswordApi = async ({ token, password, confirm_password }) => {
  const { data } = await api.post('/auth/reset-password', {
    token,
    password,
    confirm_password
  });
  return data;
};

export const getMeApi = async () => {
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          return {
            user: {
              ...profile,
              user_id: profile.id,
              status: 'ACTIVE',
              approval_status: profile.approval_status || 'APPROVED'
            }
          };
        }
      }
    } catch {
      // Continue to local API fallback
    }
  }

  const { data } = await api.get('/auth/me');
  return data;
};

export const updateProfileApi = async (profileData) => {
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', session.user.id)
          .select()
          .single();
        if (!error && data) return { user: data };
      }
    } catch {
      // Continue to local API fallback
    }
  }
  const { data } = await api.put('/auth/me/profile', profileData);
  return data;
};

export const changePasswordApi = async ({ current_password, new_password }) => {
  if (supabase) {
    const { data, error } = await supabase.auth.updateUser({ password: new_password });
    if (error) throw error;
    return { message: 'Password updated successfully' };
  }
  const { data } = await api.post('/auth/change-password', {
    current_password,
    new_password
  });
  return data;
};

// =========================================================================
// PLAYERS APIS
// =========================================================================
export const getPlayersApi = async (q = '') => {
  if (supabase) {
    try {
      let query = supabase.from('player').select('*').order('current_rating', { ascending: false });
      const cleanQ = (q || '').trim();
      if (cleanQ) {
        query = query.or(`name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%,country.ilike.%${cleanQ}%`);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((p, idx) => ({
          ...p,
          rank: idx + 1,
          points: Math.round(((p.current_rating || 1200) / 100) * 10) / 10,
          wins: 0,
          draws: 0,
          losses: 0,
          games_played: 0
        }));
      }
    } catch (err) {
      console.warn('Supabase getPlayersApi error:', err);
    }
  }
  try {
    const url = q ? `/players?q=${encodeURIComponent(q)}` : '/players';
    const { data } = await api.get(url, { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

export const getPlayerByIdApi = async (id) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('player')
        .select('*')
        .eq('player_id', id)
        .maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getPlayerByIdApi error:', err);
    }
  }
  const { data } = await api.get(`/players/${id}`);
  return data;
};

export const createPlayerApi = async (playerData) => {
  if (supabase) {
    const { data, error } = await supabase.from('player').insert(playerData).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post('/players', playerData);
  return data;
};

export const updatePlayerApi = async (id, playerData) => {
  if (supabase) {
    const { data, error } = await supabase.from('player').update(playerData).eq('player_id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.put(`/players/${id}`, playerData);
  return data;
};

export const getPlayerAnalyticsApi = async (id) => {
  try {
    const { data } = await api.get(`/players/${id}/analytics`, { timeout: 2500 });
    return data;
  } catch {
    return {
      performance: { games_played: 0, wins: 0, draws: 0, losses: 0, win_pct: 0 },
      rating_history: [],
      recent_games: []
    };
  }
};

// =========================================================================
// TOURNAMENTS APIS
// =========================================================================
export const getTournamentsApi = async () => {
  if (supabase) {
    try {
      const { data: tournaments, error } = await supabase
        .from('tournament')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && tournaments) {
        // Fetch registrations count
        const { data: regs } = await supabase.from('registration').select('tournament_id');
        const regCounts = {};
        (regs || []).forEach(r => {
          regCounts[r.tournament_id] = (regCounts[r.tournament_id] || 0) + 1;
        });

        return tournaments.map(t => ({
          ...t,
          registered: regCounts[t.tournament_id] || 0,
          rounds_created: 0,
          owner_name: 'Tournament Committee'
        }));
      }
    } catch (err) {
      console.warn('Supabase getTournamentsApi error:', err);
    }
  }
  try {
    const { data } = await api.get('/tournaments', { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

export const getTournamentByIdApi = async (id) => {
  if (supabase) {
    try {
      const { data: tournament, error } = await supabase
        .from('tournament')
        .select('*')
        .eq('tournament_id', id)
        .maybeSingle();

      if (!error && tournament) {
        // Get registered players
        const { data: regs } = await supabase
          .from('registration')
          .select('*, player(*)')
          .eq('tournament_id', id);

        const players = (regs || []).map(r => r.player).filter(Boolean);

        return {
          ...tournament,
          registered_players: players,
          registered: players.length,
          rounds: []
        };
      }
    } catch (err) {
      console.warn('Supabase getTournamentByIdApi error:', err);
    }
  }
  const { data } = await api.get(`/tournaments/${id}`);
  return data;
};

export const createTournamentApi = async (tournamentData) => {
  if (supabase) {
    const { data, error } = await supabase.from('tournament').insert(tournamentData).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post('/tournaments', tournamentData);
  return data;
};

export const updateTournamentApi = async (id, tournamentData) => {
  if (supabase) {
    const { data, error } = await supabase.from('tournament').update(tournamentData).eq('tournament_id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.put(`/tournaments/${id}`, tournamentData);
  return data;
};

export const registerPlayerApi = async (tournamentId, playerId) => {
  if (supabase) {
    const { data, error } = await supabase.from('registration').insert({
      tournament_id: Number(tournamentId),
      player_id: Number(playerId)
    }).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post(`/tournaments/${tournamentId}/register`, {
    player_id: Number(playerId)
  });
  return data;
};

export const registerMeApi = async (tournamentId) => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Authentication required');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('player_id, email, full_name')
      .eq('id', session.user.id)
      .maybeSingle();

    let targetPlayerId = profile?.player_id;
    if (!targetPlayerId) {
      // Find or create player row
      const { data: existingP } = await supabase
        .from('player')
        .select('player_id')
        .eq('email', session.user.email)
        .maybeSingle();

      if (existingP) {
        targetPlayerId = existingP.player_id;
      } else {
        const { data: newP } = await supabase
          .from('player')
          .insert({
            name: profile?.full_name || session.user.user_metadata?.full_name || 'Player',
            email: session.user.email,
            country: 'India',
            current_rating: 1200
          })
          .select('player_id')
          .single();
        if (newP) targetPlayerId = newP.player_id;
      }

      if (targetPlayerId) {
        await supabase.from('user_profiles').update({ player_id: targetPlayerId }).eq('id', session.user.id);
      }
    }

    if (!targetPlayerId) throw new Error('Player profile could not be located');

    const { data: existingReg } = await supabase
      .from('registration')
      .select('registration_id')
      .eq('tournament_id', Number(tournamentId))
      .eq('player_id', targetPlayerId)
      .maybeSingle();

    if (existingReg) {
      return existingReg;
    }

    const { data: newReg, error: regErr } = await supabase
      .from('registration')
      .insert({
        tournament_id: Number(tournamentId),
        player_id: targetPlayerId
      })
      .select()
      .single();

    if (regErr) throw regErr;
    return newReg;
  }

  const { data } = await api.post(`/tournaments/${tournamentId}/register-me`);
  return data;
};

export const getRegistrationsApi = async (tournamentId) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('registration')
        .select('*, player(*)')
        .eq('tournament_id', Number(tournamentId));
      if (!error && data) return data;
    } catch {
      // fallback
    }
  }
  const { data } = await api.get(`/tournaments/${tournamentId}/registrations`);
  return data;
};

export const removeRegistrationApi = async (tournamentId, playerId) => {
  if (supabase) {
    const { error } = await supabase
      .from('registration')
      .delete()
      .eq('tournament_id', Number(tournamentId))
      .eq('player_id', Number(playerId));
    if (error) throw error;
    return { success: true };
  }
  const { data } = await api.delete(`/tournaments/${tournamentId}/registrations/${playerId}`);
  return data;
};

export const createRoundApi = async (tournamentId) => {
  const { data } = await api.post(`/tournaments/${tournamentId}/rounds`);
  return data;
};

export const getRoundsApi = async (tournamentId) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tournament_round')
        .select('*')
        .eq('tournament_id', Number(tournamentId))
        .order('round_no', { ascending: true });
      if (!error && data) return data;
    } catch {
      // fallback
    }
  }
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/rounds`, { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

export const getStandingsApi = async (tournamentId) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tournament_standings')
        .select('*')
        .eq('tournament_id', Number(tournamentId));
      if (!error && data && data.length > 0) return data;

      // If no standings recorded yet, return registered players ordered by rating
      const { data: regs } = await supabase
        .from('registration')
        .select('player(*)')
        .eq('tournament_id', Number(tournamentId));

      return (regs || []).map((r, i) => ({
        rank: i + 1,
        player_id: r.player?.player_id,
        player_name: r.player?.name,
        country: r.player?.country,
        rating: r.player?.current_rating,
        points: 0,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0
      }));
    } catch {
      // fallback
    }
  }
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/standings`, { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

export const getTournamentAnalyticsApi = async (tournamentId) => {
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/analytics`, { timeout: 2500 });
    return data;
  } catch {
    return { outcome_distribution: { WHITE: 0, BLACK: 0, DRAW: 0, total: 0 } };
  }
};

export const getTournamentPredictionsApi = async (tournamentId) => {
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/predictions`, { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

export const startTournamentApi = async (tournamentId) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('tournament')
      .update({ status: 'ONGOING' })
      .eq('tournament_id', Number(tournamentId))
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post(`/tournaments/${tournamentId}/start`);
  return data;
};

export const completeTournamentApi = async (tournamentId) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('tournament')
      .update({ status: 'COMPLETED' })
      .eq('tournament_id', Number(tournamentId))
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post(`/tournaments/${tournamentId}/complete`);
  return data;
};

export const getTournamentProgressApi = async (tournamentId) => {
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/progress`, { timeout: 2500 });
    return data;
  } catch {
    return { rounds_total: 0, rounds_completed: 0, games_total: 0, games_completed: 0 };
  }
};

export const generateNextRoundApi = async (tournamentId) => {
  const { data } = await api.post(`/tournaments/${tournamentId}/rounds/generate`);
  return data;
};

// =========================================================================
// ROUNDS & GAMES
// =========================================================================
export const getGamesByRoundApi = async (roundId) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('round_id', Number(roundId))
        .order('board_no', { ascending: true });
      if (!error && data) return data;
    } catch {
      // fallback
    }
  }
  try {
    const { data } = await api.get(`/rounds/${roundId}/games`, { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

export const createGameApi = async (roundId, gameData) => {
  if (supabase) {
    const { data, error } = await supabase.from('game').insert({ ...gameData, round_id: Number(roundId) }).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post(`/rounds/${roundId}/games`, gameData);
  return data;
};

export const recordResultApi = async (gameId, outcome) => {
  if (supabase) {
    const { data, error } = await supabase.from('result').insert({ game_id: Number(gameId), outcome }).select().single();
    if (error) throw error;
    return data;
  }
  const { data } = await api.post(`/games/${gameId}/result`, { outcome });
  return data;
};

export const getRecentResultsApi = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('result')
        .select('*, game(*)')
        .order('recorded_at', { ascending: false })
        .limit(10);
      if (!error && data) return data;
    } catch {
      // fallback
    }
  }
  try {
    const { data } = await api.get('/games/recent', { timeout: 2500 });
    return data;
  } catch {
    return [];
  }
};

// =========================================================================
// DASHBOARD APIS (Direct Supabase Integration)
// =========================================================================
export const getDashboardApi = async () => {
  return await getMyDashboardApi();
};

export const getMyDashboardApi = async () => {
  // 1. Direct Supabase Query (Authoritative Source of Truth)
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      let profile = null;
      let role = 'PLAYER';
      let approvalStatus = 'APPROVED';
      let currentRating = 1200;
      let playerId = null;

      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (userProfile) {
          profile = userProfile;
          role = userProfile.role || 'PLAYER';
          approvalStatus = userProfile.approval_status || 'APPROVED';
          playerId = userProfile.player_id;
        }
      }

      if (playerId) {
        const { data: playerRow } = await supabase
          .from('player')
          .select('*')
          .eq('player_id', playerId)
          .maybeSingle();

        if (playerRow) {
          currentRating = playerRow.current_rating || 1200;
          profile = { ...(profile || {}), ...playerRow };
        }
      }

      // Query active/upcoming tournaments
      const { data: tournaments } = await supabase
        .from('tournament')
        .select('*')
        .order('start_date', { ascending: true });

      const openTournaments = (tournaments || []).map(t => ({
        tournament_id: t.tournament_id,
        name: t.name,
        format: t.format,
        start_date: t.start_date,
        end_date: t.end_date,
        status: t.status,
        player_count: 0
      }));

      // Query player enrollments
      let enrollments = [];
      if (playerId) {
        const { data: regRows } = await supabase
          .from('registration')
          .select('*, tournament(*)')
          .eq('player_id', playerId);

        enrollments = (regRows || []).map(r => ({
          registration_id: r.registration_id,
          tournament_id: r.tournament_id,
          tournament_name: r.tournament?.name || 'Championship Tournament',
          format: r.tournament?.format || 'ROUND_ROBIN',
          status: r.tournament?.status || 'ONGOING',
          registered_at: r.registered_at || r.created_at
        }));
      }

      // Query total players count for overview
      const { count: totalPlayersCount } = await supabase
        .from('player')
        .select('*', { count: 'exact', head: true });

      return {
        role,
        approval_status: approvalStatus,
        profile: profile || {
          name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player',
          email: user?.email,
          current_rating: currentRating
        },
        current_rating: currentRating,
        rating_history: [],
        wins: 0,
        draws: 0,
        losses: 0,
        win_rate: 0,
        win_pct: 0,
        performance: { games_played: 0, wins: 0, draws: 0, losses: 0, win_pct: 0 },
        enrollments,
        open_tournaments: openTournaments,
        pending_games: [],
        // Organizer specific fields
        my_tournaments: openTournaments,
        enrolled_players: totalPlayersCount || 0,
        recent_results: [],
        // Administrator specific fields
        overview: {
          total_users: (totalPlayersCount || 0) + 1,
          total_players: totalPlayersCount || 0,
          total_organizers: 1,
          pending_approvals: 0,
          active_tournaments: (tournaments || []).filter(t => t.status === 'ONGOING').length,
          total_games: 0
        },
        pending_users: [],
        all_tournaments: openTournaments
      };
    } catch (sbErr) {
      console.warn('Direct Supabase dashboard load notice:', sbErr);
    }
  }

  // 2. Fallback to API if Supabase client threw an error
  try {
    const { data } = await api.get('/me/dashboard', { timeout: 2500 });
    if (data) return data;
  } catch {
    // Continue to default
  }

  return {
    role: 'PLAYER',
    approval_status: 'APPROVED',
    profile: { name: 'Player', current_rating: 1200 },
    current_rating: 1200,
    rating_history: [],
    wins: 0,
    draws: 0,
    losses: 0,
    win_rate: 0,
    win_pct: 0,
    enrollments: [],
    open_tournaments: [],
    pending_games: []
  };
};

// =========================================================================
// ADMIN APIS
// =========================================================================
export const getAdminOverviewApi = async () => {
  return await getMyDashboardApi();
};

export const getAdminUsersApi = async (params = {}) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return {
          users: data.map(u => ({
            user_id: u.id,
            id: u.id,
            email: u.email,
            username: u.username,
            full_name: u.full_name,
            role: u.role,
            status: 'ACTIVE',
            approval_status: u.approval_status || 'APPROVED',
            created_at: u.created_at
          }))
        };
      }
    } catch {
      // fallback
    }
  }
  const { data } = await api.get('/admin/users', { params });
  return data;
};

export const getAdminUserByIdApi = async (id) => {
  if (supabase) {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', id).maybeSingle();
    if (data) return data;
  }
  const { data } = await api.get(`/admin/users/${id}`);
  return data;
};

export const updateAdminUserApi = async (id, userData) => {
  if (supabase) {
    const { data } = await supabase.from('user_profiles').update(userData).eq('id', id).select().single();
    if (data) return data;
  }
  const { data } = await api.put(`/admin/users/${id}`, userData);
  return data;
};

export const approveAdminUserApi = async (userId, body = {}) => {
  if (supabase) {
    await supabase.from('user_profiles').update({ approval_status: 'APPROVED' }).eq('id', userId);
    return { success: true };
  }
  const { data } = await api.post(`/admin/users/${userId}/approve`, body);
  return data;
};

export const rejectAdminUserApi = async (userId, body = {}) => {
  if (supabase) {
    await supabase.from('user_profiles').update({ approval_status: 'REJECTED' }).eq('id', userId);
    return { success: true };
  }
  const { data } = await api.post(`/admin/users/${userId}/reject`, body);
  return data;
};

export const updateAdminUserRoleApi = async (userId, role) => {
  if (supabase) {
    await supabase.from('user_profiles').update({ role }).eq('id', userId);
    return { success: true };
  }
  const { data } = await api.put(`/admin/users/${userId}/role`, { role });
  return data;
};

export const updateAdminUserStatusApi = async (userId, status) => {
  if (supabase) {
    await supabase.from('user_profiles').update({ approval_status: status }).eq('id', userId);
    return { success: true };
  }
  const endpoint = status === 'SUSPENDED'
    ? `/admin/users/${userId}/suspend`
    : `/admin/users/${userId}/reactivate`;
  const { data } = await api.post(endpoint);
  return data;
};

export const getAuditLogApi = async (params = {}) => {
  try {
    const { data } = await api.get('/admin/audit-log', { params, timeout: 2500 });
    return data;
  } catch {
    return { logs: [] };
  }
};
