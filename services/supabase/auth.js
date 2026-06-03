import * as Linking from 'expo-linking';
import { supabase } from './client';
import { getProfileById, normalizeProfile, upsertProfile } from './data';

export const AUTH_REDIRECT_PATH = 'auth-callback';
export const AUTH_REDIRECT_URL = Linking.createURL(AUTH_REDIRECT_PATH);

let currentUser = null;
const listeners = new Set();
let initialized = false;
let initPromise = null;
let authSubscription = null;

const mapSupabaseUser = (user, profile = null) => {
  if (!user) return null;

  return {
    uid: user.id,
    id: user.id,
    email: user.email,
    emailVerified: !!user.email_confirmed_at,
    name: profile?.name || user.user_metadata?.name || user.email?.split('@')?.[0] || 'User',
    bio: profile?.bio || '',
    profilePhoto: profile?.profilePhoto || null,
    profilePhotoPath: profile?.profilePhotoPath || profile?.profilePhoto || null,
    following: profile?.following || [],
    followers: profile?.followers || [],
    searchHistory: profile?.searchHistory || [],
  };
};

const broadcast = () => {
  listeners.forEach((listener) => listener(currentUser));
};

const isEmailConfirmed = (user) => !!(user?.email_confirmed_at || user?.confirmed_at);

export const extractAuthParamsFromUrl = (url) => {
  if (!url) return {};

  try {
    const parsedUrl = new URL(url);
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
    const hashParams = parsedUrl.hash
      ? Object.fromEntries(new URLSearchParams(parsedUrl.hash.slice(1)).entries())
      : {};

    return { ...hashParams, ...queryParams };
  } catch {
    return {};
  }
};

const setCurrentUserFromSession = async (session) => {
  if (!session?.user) {
    currentUser = null;
    broadcast();
    return null;
  }

  if (!isEmailConfirmed(session.user)) {
    currentUser = null;
    broadcast();
    return null;
  }

  const profile =
    (await getProfileById(session.user.id).catch(() => null)) ||
    (await ensureProfileForUser(session.user).catch(() => null));
  currentUser = mapSupabaseUser(session.user, profile);
  broadcast();
  return currentUser;
};

export const auth = {
  get currentUser() {
    return currentUser;
  },
  signOut,
  reload,
  signInWithEmailAndPassword,
  signUpWithEmailAndPassword,
  resendSignupConfirmation,
};

export async function initializeAuth() {
  if (initialized) return currentUser;

  if (!initPromise) {
    initPromise = supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;

      initialized = true;
      await setCurrentUserFromSession(data.session);

      if (!authSubscription) {
        const { data: subscriptionData } = supabase.auth.onAuthStateChange((_event, session) => {
          void setCurrentUserFromSession(session);
        });
        authSubscription = subscriptionData.subscription;
      }

      return currentUser;
    });
  }

  return initPromise;
}

export async function signUpWithEmailAndPassword(_auth, email, password) {
  const normalizedEmail = String(email || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!normalizedPassword) {
    throw new Error('Password is required.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: normalizedPassword,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL,
      data: {
        name: normalizedEmail.split('@')[0],
      },
    },
  });

  if (error) throw error;

  if (data?.session) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await setCurrentUserFromSession(null);
  }

  return {
    user: mapSupabaseUser(data.user),
    session: null,
    needsEmailConfirmation: true,
  };
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const normalizedEmail = String(email || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!normalizedPassword) {
    throw new Error('Password is required.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) throw error;

  if (!isEmailConfirmed(data.user)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await setCurrentUserFromSession(null);
    throw new Error('Please verify your email before logging in.');
  }

  await setCurrentUserFromSession(data.session);

  return {
    user: mapSupabaseUser(data.user, await getProfileById(data.user.id).catch(() => null)),
    session: data.session,
  };
}

export async function resendSignupConfirmation(_auth, email) {
  const normalizedEmail = String(email || '').trim();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL,
    },
  });

  if (error) throw error;
  return data;
}

export async function ensureProfileForUser(user) {
  if (!user?.id || !user?.email) return null;
  if (!isEmailConfirmed(user)) return null;

  const existingProfile = await getProfileById(user.id).catch(() => null);
  if (existingProfile) return existingProfile;

  return upsertProfile({
    id: user.id,
    email: user.email,
    name: user.email.split('@')[0],
    profilePhoto: null,
    bio: '',
    following: [],
    followers: [],
    searchHistory: [],
  });
}

export async function restoreSessionFromUrl(url) {
  const params = extractAuthParamsFromUrl(url);
  const code = params.code;
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const tokenHash = params.token_hash;
  const otpType = params.type || 'signup';

  if (!code && !(accessToken && refreshToken) && !tokenHash) {
    return false;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) throw error;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  if (!data.session?.user || !isEmailConfirmed(data.session.user)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await setCurrentUserFromSession(null);
    throw new Error('Email verification did not complete. Please open the latest email link.');
  }

  await setCurrentUserFromSession(data.session);
  return true;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  currentUser = null;
  broadcast();
}

export async function reload() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  await setCurrentUserFromSession(data.session);
}

export function onAuthStateChanged(_auth, callback) {
  listeners.add(callback);
  if (initialized) {
    callback(currentUser);
  } else {
    initializeAuth().then(() => callback(currentUser));
  }
  return () => listeners.delete(callback);
}

export async function getCurrentUserProfile() {
  if (!currentUser?.uid) return null;
  const profile = await getProfileById(currentUser.uid);
  return profile
    ? normalizeProfile({
        id: profile.uid,
        email: profile.email,
        name: profile.name,
        bio: profile.bio,
        profile_photo: profile.profilePhoto,
        profilePhotoPath: profile.profilePhotoPath || profile.profilePhoto,
        following: profile.following,
        followers: profile.followers,
        search_history: profile.searchHistory,
      })
    : null;
}
