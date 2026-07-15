import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

export type AuthStateCallback = (user: AuthenticatedUser | null) => void;
export type AuthErrorCallback = (error: Error) => void;

export const toAuthenticatedUser = (user: User): AuthenticatedUser => ({
  uid: user.uid,
  email: user.email,
});

const persistenceReady = firebaseAuth
  ? setPersistence(firebaseAuth, browserLocalPersistence)
  : Promise.resolve();

export const signIn = async (email: string, password: string) => {
  if (!firebaseAuth) {
    throw new Error('Firebase Authentication is not configured.');
  }

  await persistenceReady;
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return toAuthenticatedUser(credential.user);
};

export const signOutUser = async () => {
  if (!firebaseAuth) {
    return;
  }

  await signOut(firebaseAuth);
};

export const subscribeToAuthState = (callback: AuthStateCallback, onError?: AuthErrorCallback) => {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(
    firebaseAuth,
    (user) => {
      callback(user ? toAuthenticatedUser(user) : null);
    },
    onError
  );
};

export const getFriendlyAuthError = (error: unknown) => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  ) {
    return 'The email or password is incorrect.';
  }

  if (code.includes('too-many-requests')) {
    return 'Too many sign-in attempts. Please try again later.';
  }

  if (code.includes('network-request-failed')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }

  return 'Sign in failed. Please check your details and try again.';
};
