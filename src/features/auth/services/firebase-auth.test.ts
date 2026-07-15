import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setPersistence: vi.fn(async () => undefined),
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local',
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  onAuthStateChanged: authMocks.onAuthStateChanged,
  setPersistence: authMocks.setPersistence,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signOut: authMocks.signOut,
}));

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: authMocks.auth,
}));

import {
  createAccount,
  FAMILY_AUTH_EMAIL,
  FAMILY_USERNAME,
  FAMILY_USERNAME_LABEL,
  getFriendlyAuthError,
  signIn,
  signOutUser,
  subscribeToAuthState,
} from '@/features/auth/services/firebase-auth';

describe('Firebase auth service', () => {
  beforeEach(() => {
    authMocks.createUserWithEmailAndPassword.mockReset();
    authMocks.signInWithEmailAndPassword.mockReset();
    authMocks.signOut.mockReset();
    authMocks.onAuthStateChanged.mockReset();
  });

  it('defines the shared family account mapping', () => {
    expect(FAMILY_USERNAME).toBe('school');
    expect(FAMILY_USERNAME_LABEL).toBe('School');
    expect(FAMILY_AUTH_EMAIL).toBe('school@parentcompanion.app');
  });

  it('signs in with Firebase Email/Password', async () => {
    authMocks.signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'uid-1', email: 'school@parentcompanion.app' },
    });

    await expect(signIn('school@parentcompanion.app', 'family-pass-1')).resolves.toEqual({
      uid: 'uid-1',
      email: 'school@parentcompanion.app',
    });
    expect(authMocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
      authMocks.auth,
      'school@parentcompanion.app',
      'family-pass-1'
    );
  });

  it('creates an account and returns the Firebase-created authenticated user', async () => {
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: 'generated-parent-uid',
        email: 'school@parentcompanion.app',
      },
    });

    await expect(createAccount('school@parentcompanion.app', 'family-pass-1')).resolves.toEqual({
      uid: 'generated-parent-uid',
      email: 'school@parentcompanion.app',
    });
    expect(authMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      authMocks.auth,
      'school@parentcompanion.app',
      'family-pass-1'
    );
  });

  it('subscribes to Firebase auth state and returns typed users', () => {
    const unsubscribe = vi.fn();
    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: 'uid-1', email: 'school@parentcompanion.app' });
      return unsubscribe;
    });
    const callback = vi.fn();

    expect(subscribeToAuthState(callback)).toBe(unsubscribe);

    expect(callback).toHaveBeenCalledWith({
      uid: 'uid-1',
      email: 'school@parentcompanion.app',
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
      'The username or password is incorrect.'
    );
    expect(getFriendlyAuthError({ code: 'auth/permission-denied' })).not.toContain('auth/');
    expect(getFriendlyAuthError({ code: 'auth/weak-password' }, 'createAccount')).toBe(
      'Choose a password with at least 6 characters.'
    );
    expect(getFriendlyAuthError({ code: 'auth/email-already-in-use' }, 'createAccount')).toBe(
      'The family account already exists. Please sign in.'
    );
    expect(getFriendlyAuthError({ code: 'auth/operation-not-allowed' }, 'createAccount')).toBe(
      'Account creation is not available yet. Check Firebase Authentication setup.'
    );
    expect(
      getFriendlyAuthError(new Error('Firebase Authentication is not configured.'), 'createAccount')
    ).toBe('Firebase Authentication is not configured. Check local setup.');
  });
});
