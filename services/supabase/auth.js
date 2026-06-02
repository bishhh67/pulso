import { supabase } from './client';
import { getProfileById, normalizeProfile } from './data';

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
};

export async function initializeAuth() {
  if (initialized) return currentUser;
  if (!initPromise) {
    initPromise = supabase.auth.getSession().then(async ({ data }) => {
      initialized = true;
      await setCurrentUserFromSession(data.session);
      supabase.auth.onAuthStateChange(async (_event, session) => {
        await setCurrentUserFromSession(session);
      });
      return currentUser;
    });
  }
  return initPromise;
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await setCurrentUserFromSession(data.session);
  return { user: mapSupabaseUser(data.user, await getProfileById(data.user.id).catch(() => null)) };
}

export async function createUserWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.EXPO_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO || undefined,
    },
  });

  if (error) throw error;

  return {
    user: mapSupabaseUser(data.user, await getProfileById(data.user?.id).catch(() => null)),
    session: data.session,
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  currentUser = null;
  broadcast();
}

export async function sendEmailVerification(user) {
  if (!user?.email) return;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
  });
  if (error) throw error;
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
