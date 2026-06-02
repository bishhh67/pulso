import { supabase } from './client';
import { getProfileById, normalizeProfile, upsertProfile } from './data';
import * as Linking from 'expo-linking';

let currentUser = null;
const listeners = new Set();
let initialized = false;
let initPromise = null;

const mapSupabaseUser = (user, profile = null) => {
  if (!user) return null;
  const baseProfile = profile ? profile : null;
  return {
    uid: user.id,
    id: user.id,
    email: user.email,
    emailVerified: !!user.email_confirmed_at,
    name: baseProfile?.name || user.user_metadata?.name || user.email?.split('@')?.[0] || 'User',
    bio: baseProfile?.bio || '',
    profilePhoto: baseProfile?.profilePhoto || null,
    profilePhotoPath: baseProfile?.profilePhotoPath || baseProfile?.profilePhoto || null,
    following: baseProfile?.following || [],
    followers: baseProfile?.followers || [],
    searchHistory: baseProfile?.searchHistory || [],
  };
};

const broadcast = () => {
  listeners.forEach((listener) => listener(currentUser));
};

const setCurrentUserFromSession = async (session) => {
  if (!session?.user) {
    currentUser = null;
    broadcast();
    return null;
  }

  const profile = await getProfileById(session.user.id).catch(() => null);
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
  createUserWithEmailAndPassword,
  requestEmailOtp,
  verifyEmailOtp,
};

export async function initializeAuth() {
  if (initialized) return currentUser;
  if (!initPromise) {
    initPromise = supabase.auth.getSession().then(async ({ data }) => {
      initialized = true;
      await setCurrentUserFromSession(data.session);
      supabase.auth.onAuthStateChange((_event, session) => {
        void setCurrentUserFromSession(session);
      });
      return currentUser;
    });
  }
  return initPromise;
}

export async function requestEmailOtp(email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: Linking.createURL('/'),
    },
  });

  if (error) throw error;

  return data;
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

  await setCurrentUserFromSession(data.session);

  return {
    user: mapSupabaseUser(
      data.user,
      await getProfileById(data.user.id).catch(() => null)
    ),
    session: data.session,
  };
}



export async function createUserWithEmailAndPassword(_, email, password) {
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
  });

  if (error) throw error;

  if (data?.session) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await setCurrentUserFromSession(null);
  }

  return {
    user: mapSupabaseUser(data.user, await getProfileById(data.user?.id).catch(() => null)),
    session: data.session || null,
  };
}






export async function verifyEmailOtp(email, token) {
  const normalizedEmail = String(email || '').trim();
  const normalizedToken = String(token || '').trim();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!normalizedToken) {
    throw new Error('Verification code is required.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: 'email',
  });

  if (error) throw error;
  if (!data?.session?.user) {
    throw new Error('Verification succeeded, but no session was returned.');
  }

  await setCurrentUserFromSession(data.session);

  return {
    user: mapSupabaseUser(
      data.user || data.session.user,
      await getProfileById(data.session.user.id).catch(() => null)
    ),
    session: data.session,
  };
}

export async function ensureProfileForUser(user) {
  if (!user?.id || !user?.email) return null;

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
  return profile ? normalizeProfile({
    id: profile.uid,
    email: profile.email,
    name: profile.name,
    bio: profile.bio,
    profile_photo: profile.profilePhoto,
    profilePhotoPath: profile.profilePhotoPath || profile.profilePhoto,
    following: profile.following,
    followers: profile.followers,
    search_history: profile.searchHistory,
  }) : null;
}
