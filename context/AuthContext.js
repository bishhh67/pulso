// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  signUpWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  initializeAuth,
} from '../services/supabase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    let mounted = true;

    initializeAuth()
      .then(() => {
        if (!mounted) return;
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
      })
      .catch((error) => {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    setUser(result.user);
    return result;
  };

  const signup = async (email, password) => {
    return signUpWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // 🔹 Wait until we know the auth state
  if (loading) {
    return null; // You can return a <Loader /> component here
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
