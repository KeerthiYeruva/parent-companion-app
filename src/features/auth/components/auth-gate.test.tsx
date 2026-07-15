// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { AuthProvider } from '@/features/auth/components/auth-context';
import { useAppStore } from '@/store/use-app-store';

const authMocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  signIn: vi.fn(),
  signOutUser: vi.fn(),
  subscribeToAuthState: vi.fn(),
}));

vi.mock('@/features/auth/services/firebase-auth', () => ({
  createAccount: authMocks.createAccount,
  getFriendlyAuthError: (error: { code?: string }) => {
    if (error.code === 'auth/email-already-in-use') {
      return 'An account already exists for this email. Please sign in.';
    }
    return 'The email or password is incorrect.';
  },
  signIn: authMocks.signIn,
  signOutUser: authMocks.signOutUser,
  subscribeToAuthState: authMocks.subscribeToAuthState,
}));

const renderGate = () =>
  render(
    <AuthProvider>
      <AuthGate>
        <div>Planner loaded</div>
      </AuthGate>
    </AuthProvider>
  );

describe('auth gate', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authMocks.createAccount.mockReset();
    authMocks.signIn.mockReset();
    authMocks.signOutUser.mockReset();
    authMocks.subscribeToAuthState.mockReset();
    useAppStore.setState({ syncStatus: 'signedOut' });
  });

  it('shows the login screen for signed-out users', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    expect(await screen.findByRole('heading', { name: 'Parent Companion' })).toBeTruthy();
    expect(screen.queryByText('Planner loaded')).toBeNull();
  });

  it('does not flash the planner before auth resolves', () => {
    authMocks.subscribeToAuthState.mockReturnValue(vi.fn());

    renderGate();

    expect(screen.getByText('Preparing secure sync...')).toBeTruthy();
    expect(screen.queryByText('Planner loaded')).toBeNull();
  });

  it('shows a friendly message when auth initialization fails', async () => {
    authMocks.subscribeToAuthState.mockImplementation((_callback, onError) => {
      onError(new Error('observer failed'));
      return vi.fn();
    });

    renderGate();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Authentication could not be initialized. Please reload and try again.'
    );
    expect(screen.queryByText('Planner loaded')).toBeNull();
  });

  it('calls sign in with the entered Email/Password', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });
    authMocks.signIn.mockResolvedValue({ uid: 'uid-1', email: 'parent@example.com' });

    renderGate();

    await userEvent.type(screen.getByLabelText('Email'), 'parent@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(authMocks.signIn).toHaveBeenCalledWith('parent@example.com', 'secret');
  });

  it('shows a friendly error for invalid login', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });
    authMocks.signIn.mockRejectedValue({ code: 'auth/invalid-credential' });

    renderGate();

    await userEvent.type(screen.getByLabelText('Email'), 'parent@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'bad-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The email or password is incorrect.'
    );
    expect(screen.getByRole('alert').textContent).not.toContain('auth/');
  });

  it('switches between sign-in and create-account modes', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();
    await userEvent.click(screen.getByRole('button', { name: 'New parent? Create account' }));

    expect(screen.getByLabelText('Confirm password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(screen.queryByLabelText('Confirm password')).toBeNull();
  });

  it('creates an account with the entered email and unaltered password', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });
    authMocks.createAccount.mockResolvedValue({
      uid: 'generated-uid',
      email: 'new-parent@example.com',
    });

    renderGate();
    await userEvent.click(screen.getByRole('button', { name: 'New parent? Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), '  new-parent@example.com  ');
    await userEvent.type(screen.getByLabelText('Password'), ' secret1 ');
    await userEvent.type(screen.getByLabelText('Confirm password'), ' secret1 ');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(authMocks.createAccount).toHaveBeenCalledWith('new-parent@example.com', ' secret1 ');
  });

  it('blocks account creation when passwords do not match', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();
    await userEvent.click(screen.getByRole('button', { name: 'New parent? Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), 'new-parent@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert').textContent).toBe('Passwords do not match.');
    expect(authMocks.createAccount).not.toHaveBeenCalled();
  });

  it('shows signup validation and existing-account errors without Firebase codes', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();
    await userEvent.click(screen.getByRole('button', { name: 'New parent? Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), 'invalid-email');
    await userEvent.type(screen.getByLabelText('Password'), 'secret1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret1');
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email address.');

    await userEvent.clear(screen.getByLabelText('Email'));
    await userEvent.type(screen.getByLabelText('Email'), 'parent@example.com');
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert').textContent).toBe(
      'Choose a stronger password with at least 6 characters.'
    );

    authMocks.createAccount.mockRejectedValue({ code: 'auth/email-already-in-use' });
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Password'), 'secret1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'An account already exists for this email. Please sign in.'
    );
  });

  it('shows access pending with the current UID after permission is denied', async () => {
    useAppStore.setState({ syncStatus: 'permissionDenied' });
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback({ uid: 'generated-parent-uid', email: 'new-parent@example.com' });
      return vi.fn();
    });

    renderGate();

    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeTruthy();
    expect(screen.getByText('generated-parent-uid')).toBeTruthy();
    expect(screen.queryByText('Planner loaded')).toBeNull();
  });

  it('copies only the current UID and signs out from access pending', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    useAppStore.setState({ syncStatus: 'permissionDenied' });
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback({ uid: 'uid-to-copy', email: 'new-parent@example.com' });
      return vi.fn();
    });

    renderGate();
    await userEvent.click(await screen.findByRole('button', { name: 'Copy User ID' }));
    expect(writeText).toHaveBeenCalledWith('uid-to-copy');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(authMocks.signOutUser).toHaveBeenCalledTimes(1);
  });

  it('shows the planner for an approved authenticated user', async () => {
    useAppStore.setState({ syncStatus: 'synced' });
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback({ uid: 'approved-uid', email: 'parent@example.com' });
      return vi.fn();
    });

    renderGate();
    expect(await screen.findByText('Planner loaded')).toBeTruthy();
    expect(screen.queryByText('Account created')).toBeNull();
  });
});
