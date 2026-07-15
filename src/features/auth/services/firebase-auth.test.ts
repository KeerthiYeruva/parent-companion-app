import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setPersistence: vi.fn(async () => undefined),
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local',
  onAuthStateChanged: authMocks.onAuthStateChanged,
  setPersistence: authMocks.setPersistence,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signOut: authMocks.signOut,
}));

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: authMocks.auth,
}));

import {
  getFriendlyAuthError,
  signIn,
  signOutUser,
  subscribeToAuthState,
} from '@/features/auth/services/firebase-auth';

describe('Firebase auth service', () => {
  beforeEach(() => {
    authMocks.signInWithEmailAndPassword.mockReset();
    authMocks.signOut.mockReset();
    authMocks.onAuthStateChanged.mockReset();
  });

  it('signs in with Firebase Email/Password', async () => {
    authMocks.signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'uid-1', email: 'parent@example.com' },
    });

    await expect(signIn('parent@example.com', 'secret')).resolves.toEqual({
      uid: 'uid-1',
      email: 'parent@example.com',
    });
    expect(authMocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
      authMocks.auth,
      'parent@example.com',
      'secret'
    );
  });

  it('subscribes to Firebase auth state and returns typed users', () => {
    const unsubscribe = vi.fn();
    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: 'uid-1', email: 'parent@example.com' });
      return unsubscribe;
    });
    const callback = vi.fn();

    expect(subscribeToAuthState(callback)).toBe(unsubscribe);

    expect(callback).toHaveBeenCalledWith({
      uid: 'uid-1',
      email: 'parent@example.com',
    });
  });

  it('forwards auth observer initialization errors', () => {
    const unsubscribe = vi.fn();
    const error = new Error('observer failed');
    authMocks.onAuthStateChanged.mockImplementation((_auth, _callback, onError) => {
      onError(error);
      return unsubscribe;
    });
    const onError = vi.fn();

    expect(subscribeToAuthState(vi.fn(), onError)).toBe(unsubscribe);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('signs out through Firebase Auth', async () => {
    await signOutUser();

    expect(authMocks.signOut).toHaveBeenCalledWith(authMocks.auth);
  });

  it('maps Firebase errors to friendly messages', () => {
    expect(getFriendlyAuthError({ code: 'auth/invalid-credential' })).toBe(
      'The email or password is incorrect.'
    );
    expect(getFriendlyAuthError({ code: 'auth/permission-denied' })).not.toContain('auth/');
  });
});
