import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { loginApi, getMeApi, registerApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('chess_token') || sessionStorage.getItem('chess_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('chess_user') || sessionStorage.getItem('chess_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Onboarding state for Google OAuth or new Supabase users
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase sign out notice:', err);
    }
    setToken(null);
    setUser(null);
    setNeedsOnboarding(false);
    setOnboardingUser(null);
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
    sessionStorage.removeItem('chess_token');
    sessionStorage.removeItem('chess_user');
  }, []);

  const setAuthSession = useCallback((newToken, newUser, rememberMe = true) => {
    setToken(newToken);
    setUser(newUser);
    setNeedsOnboarding(false);
    setOnboardingUser(null);
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
    sessionStorage.removeItem('chess_token');
    sessionStorage.removeItem('chess_user');

    const storage = rememberMe ? localStorage : sessionStorage;
    if (newToken) {
      storage.setItem('chess_token', newToken);
    }
    if (newUser) {
      storage.setItem('chess_user', JSON.stringify(newUser));
    }
  }, []);

  // Fetch or verify Supabase profile
  const fetchSupabaseProfile = useCallback(async (sbUser, accessToken) => {
    if (!sbUser || !supabase) return null;
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase profile fetch error:', error.message);
      }

      if (profile && profile.onboarding_completed) {
        const enrichedUser = {
          ...profile,
          user_id: profile.id,
          id: profile.id,
          status: 'ACTIVE',
          approval_status: profile.approval_status || 'APPROVED'
        };
        setAuthSession(accessToken, enrichedUser, true);
        return enrichedUser;
      } else {
        // Needs onboarding (e.g. first-time Google sign-in)
        const isGoogle = sbUser.app_metadata?.provider === 'google' || 
          sbUser.identities?.some(i => i.provider === 'google');

        const initialOnboard = {
          id: sbUser.id,
          email: sbUser.email,
          full_name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || '',
          avatar_url: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
          isGoogleUser: isGoogle,
          onboarding_completed: false
        };
        setOnboardingUser(initialOnboard);
        setNeedsOnboarding(true);
        return null;
      }
    } catch (err) {
      console.warn('Failed to resolve profile in Supabase:', err);
      return null;
    }
  }, [setAuthSession]);

  // Refresh user data from API or Supabase
  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem('chess_token') || sessionStorage.getItem('chess_token');
    if (!activeToken) return;

    // 1. Try Supabase Auth getSession first
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchSupabaseProfile(session.user, session.access_token);
          return;
        }
      } catch (err) {
        console.warn('Supabase refresh notice:', err);
      }
    }

    // 2. Fall back to local REST API
    try {
      const data = await getMeApi();
      const userData = data?.user || (data?.user_id ? data : null);
      if (userData) {
        setUser(userData);
        if (localStorage.getItem('chess_token')) {
          localStorage.setItem('chess_user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('chess_user', JSON.stringify(userData));
        }
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  }, [logout, fetchSupabaseProfile]);

  // Supabase Auth state listener for OAuth callbacks & session restoration
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    // Listen to live auth changes (e.g. Google OAuth redirect callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          await fetchSupabaseProfile(session.user, session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setToken(null);
        setNeedsOnboarding(false);
        setOnboardingUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchSupabaseProfile]);

  // Initiate Google OAuth via Supabase
  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase is not initialized');
    const redirectUrl = window.location.origin + '/register';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) throw error;
    return data;
  };

  // Complete onboarding profile for Google users or Supabase users
  const completeGoogleProfile = async ({
    username,
    full_name,
    role,
    country_code,
    country,
    phone,
    organization
  }) => {
    if (!supabase) throw new Error('Supabase client is not available');

    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || onboardingUser;
    if (!currentUser) throw new Error('No active authenticated session found. Please sign in again.');

    const cleanUsername = (username || '').trim();
    if (!cleanUsername) throw new Error('Username is required');

    // 1. Enforce unique username check in user_profiles
    const { data: existingUser, error: checkErr } = await supabase
      .from('user_profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser && existingUser.id !== currentUser.id) {
      throw new Error('This username is already taken. Please choose another.');
    }

    // 2. If Player, create or link player record
    let playerId = null;
    const resolvedRole = role === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER'; // Strictly prevent public ADMIN assignment

    if (resolvedRole === 'PLAYER') {
      try {
        const { data: existingPlayer } = await supabase
          .from('player')
          .select('player_id')
          .ilike('email', currentUser.email)
          .maybeSingle();

        if (existingPlayer) {
          playerId = existingPlayer.player_id;
        } else {
          const { data: newPlayer, error: pErr } = await supabase
            .from('player')
            .insert({
              name: full_name.trim(),
              email: currentUser.email,
              country: country || null,
              country_code: country_code || null,
              current_rating: 1200
            })
            .select('player_id')
            .single();

          if (!pErr && newPlayer) {
            playerId = newPlayer.player_id;
          }
        }
      } catch (err) {
        console.warn('Player record linkage notice:', err);
      }
    }

    // 3. Upsert into public.user_profiles
    const profilePayload = {
      id: currentUser.id,
      email: currentUser.email,
      full_name: full_name.trim(),
      username: cleanUsername,
      role: resolvedRole,
      country_code: country_code || null,
      country: country || null,
      phone: resolvedRole === 'ORGANIZER' ? (phone?.trim() || null) : null,
      organization: resolvedRole === 'ORGANIZER' ? (organization?.trim() || null) : null,
      player_id: playerId,
      onboarding_completed: true,
      approval_status: 'APPROVED',
      updated_at: new Date().toISOString()
    };

    const { data: savedProfile, error: saveErr } = await supabase
      .from('user_profiles')
      .upsert(profilePayload)
      .select()
      .single();

    if (saveErr) throw saveErr;

    const finalUser = {
      ...savedProfile,
      user_id: savedProfile.id,
      status: 'ACTIVE',
      approval_status: 'APPROVED'
    };

    const accessToken = session?.access_token || localStorage.getItem('chess_token');
    setAuthSession(accessToken, finalUser, true);
    return finalUser;
  };

  // Login supporting both email and username (including admin@1234)
  const login = async (emailOrUsername, password, rememberMe = false) => {
    const cleanIdentifier = (emailOrUsername || '').trim();

    // 1. Try Supabase Auth resolution first
    if (supabase) {
      try {
        let targetEmail = cleanIdentifier;
        let profileRole = null;

        // Resolve username to email from user_profiles (e.g. 'admin@1234' -> 'admin@chessmagic.internal')
        const { data: matchedProfile } = await supabase
          .from('user_profiles')
          .select('id, email, role, full_name, username, onboarding_completed, approval_status, player_id, country_code')
          .or(`username.ilike.${cleanIdentifier},email.ilike.${cleanIdentifier}`)
          .maybeSingle();

        if (matchedProfile?.email) {
          targetEmail = matchedProfile.email;
          profileRole = matchedProfile.role;
        }

        // Supabase Auth password verification
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password
        });

        if (!authErr && authData?.session) {
          const profile = matchedProfile || {
            id: authData.user.id,
            email: authData.user.email,
            username: cleanIdentifier,
            full_name: authData.user.user_metadata?.full_name || cleanIdentifier,
            role: profileRole || 'PLAYER',
            onboarding_completed: true,
            approval_status: 'APPROVED'
          };

          const resolvedUser = {
            ...profile,
            user_id: profile.id,
            status: 'ACTIVE',
            approval_status: profile.approval_status || 'APPROVED'
          };

          setAuthSession(authData.session.access_token, resolvedUser, rememberMe);
          if (rememberMe) {
            localStorage.setItem('chess_remembered_identifier', cleanIdentifier);
          } else {
            localStorage.removeItem('chess_remembered_identifier');
          }

          return { token: authData.session.access_token, user: resolvedUser };
        }
      } catch (err) {
        console.warn('Supabase login resolution attempt notice:', err);
      }
    }

    // 2. Fall back to local REST API login
    const data = await loginApi(cleanIdentifier, password, rememberMe);
    const resolvedUser = data.user || {
      user_id: data.user_id,
      email: data.email,
      username: data.username,
      full_name: data.full_name,
      role: data.role,
      status: data.status,
      approval_status: data.approval_status,
      approval_note: data.approval_note,
      permissions: data.permissions
    };
    setAuthSession(data.token, resolvedUser, rememberMe);
    if (rememberMe) {
      localStorage.setItem('chess_remembered_identifier', cleanIdentifier);
    } else {
      localStorage.removeItem('chess_remembered_identifier');
    }
    return data;
  };

  // Sign up with email & password via Supabase + local API
  const signUpWithPassword = async (payload) => {
    const { email, password, username, full_name, role, country_code, country, phone, organization } = payload;
    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const resolvedRole = role === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';

    // 1. Supabase Auth signup
    if (supabase) {
      // Check username uniqueness
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('This username is already taken. Please choose another.');
      }

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: full_name.trim(),
            username: cleanUsername,
            role: resolvedRole
          }
        }
      });

      if (authErr) throw authErr;

      if (authData?.user) {
        let playerId = null;
        if (resolvedRole === 'PLAYER') {
          try {
            const { data: pRow } = await supabase
              .from('player')
              .insert({
                name: full_name.trim(),
                email: cleanEmail,
                country: country || null,
                country_code: country_code || null,
                current_rating: 1200
              })
              .select('player_id')
              .single();
            if (pRow) playerId = pRow.player_id;
          } catch (e) {
            console.warn('Player insert notice:', e);
          }
        }

        const profileData = {
          id: authData.user.id,
          email: cleanEmail,
          full_name: full_name.trim(),
          username: cleanUsername,
          role: resolvedRole,
          country_code: country_code || null,
          country: country || null,
          phone: resolvedRole === 'ORGANIZER' ? (phone?.trim() || null) : null,
          organization: resolvedRole === 'ORGANIZER' ? (organization?.trim() || null) : null,
          player_id: playerId,
          onboarding_completed: true,
          approval_status: 'APPROVED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await supabase.from('user_profiles').upsert(profileData);

        if (authData.session) {
          const finalUser = { ...profileData, user_id: profileData.id, status: 'ACTIVE' };
          setAuthSession(authData.session.access_token, finalUser, true);
        }

        // Also register via local API in background to keep local DB in sync
        try {
          await registerApi({ ...payload, email: cleanEmail, username: cleanUsername });
        } catch {
          // Non-blocking
        }

        return { user: profileData, session: authData.session };
      }
    }

    // Fallback to local API
    return await registerApi(payload);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn: !!token && !!user && user.onboarding_completed !== false,
        needsOnboarding,
        onboardingUser,
        authLoading,
        signInWithGoogle,
        completeGoogleProfile,
        signUpWithPassword,
        login,
        logout,
        refreshUser,
        setAuthSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
