import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthUser } from '../types/storage';

// Initialize Firebase App singleton safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Standard Google Auth Provider with NO sensitive scopes
// This ensures that ANY Google user can log in without "Test users" or "access_denied" restrictions!
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token management
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Local storage key for fallback local email users
const LOCAL_USER_KEY = 'cloudvault_active_local_user';
const LOCAL_ACCOUNTS_KEY = 'cloudvault_registered_accounts';

export const initAuth = (
  onAuthSuccess?: (user: AuthUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check local user first
  const localSaved = localStorage.getItem(LOCAL_USER_KEY);
  if (localSaved) {
    try {
      const parsedUser = JSON.parse(localSaved);
      if (onAuthSuccess) onAuthSuccess(parsedUser, null);
      return () => {};
    } catch (e) {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const authUser: AuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isGoogleUser: true,
      };

      if (onAuthSuccess) onAuthSuccess(authUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (!localStorage.getItem(LOCAL_USER_KEY) && onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Clean Google Sign-In without sensitive scopes.
 * Friends and developers can all sign in without needing test user authorization!
 */
export const googleSignIn = async (): Promise<{ user: AuthUser; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    localStorage.removeItem(LOCAL_USER_KEY);

    const authUser: AuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      isGoogleUser: true,
    };

    return { user: authUser, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const emailSignIn = async (
  email: string,
  pass: string
): Promise<{ user: AuthUser; accessToken: null }> => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    const authUser: AuthUser = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: res.user.displayName || email.split('@')[0],
      photoURL: res.user.photoURL,
      isGoogleUser: false,
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
    return { user: authUser, accessToken: null };
  } catch (firebaseErr: any) {
    console.warn('Firebase email auth attempt:', firebaseErr.code || firebaseErr.message);

    // Resilient fallback account
    const accountsRaw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const matched = accounts.find(
      (acc: any) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === pass
    );

    if (matched) {
      const authUser: AuthUser = {
        uid: matched.uid,
        email: matched.email,
        displayName: matched.name,
        photoURL: null,
        isGoogleUser: false,
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
      return { user: authUser, accessToken: null };
    }

    throw new Error(
      firebaseErr.code === 'auth/invalid-credential' || firebaseErr.code === 'auth/wrong-password'
        ? 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।'
        : 'ইমেইল দিয়ে লগইন করতে সমস্যা হয়েছে। পাসওয়ার্ড চেক করুন অথবা নতুন একাউন্ট খুলুন।'
    );
  }
};

export const emailSignUp = async (
  name: string,
  email: string,
  pass: string
): Promise<{ user: AuthUser; accessToken: null }> => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && res.user) {
      await updateProfile(res.user, { displayName: name });
    }
    const authUser: AuthUser = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: name || email.split('@')[0],
      photoURL: res.user.photoURL,
      isGoogleUser: false,
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
    return { user: authUser, accessToken: null };
  } catch (firebaseErr: any) {
    console.warn('Firebase email signup attempt:', firebaseErr.code || firebaseErr.message);

    const accountsRaw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];

    const existing = accounts.find((acc: any) => acc.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('এই ইমেইল দিয়ে ইতোমধ্যে একটি একাউন্ট খোলা হয়েছে। লগইন ট্যাবে যান।');
    }

    const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAccount = {
      uid: newUid,
      email,
      name: name || email.split('@')[0],
      password: pass,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));

    const authUser: AuthUser = {
      uid: newUid,
      email,
      displayName: newAccount.name,
      photoURL: null,
      isGoogleUser: false,
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
    return { user: authUser, accessToken: null };
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  localStorage.removeItem(LOCAL_USER_KEY);
  await signOut(auth).catch(() => {});
  cachedAccessToken = null;
};
