// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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

vi.mock('@/features/auth/services/firebase-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/services/firebase-auth')>(
    '@/features/auth/services/firebase-auth'
  );

  return {
    ...actual,
    createAccount: authMocks.createAccount,
    getFriendlyAuthError: (error: { code?: string }) => {
      if (error.code === 'auth/email-already-in-use') {
        return 'The family account already exists. Please sign in.';
      }
      if (error.code === 'auth/weak-password') {
        return 'Choose a password with at least 6 characters.';
      }
      return 'The username or password is incorrect.';
    },
    signIn: authMocks.signIn,
    signOutUser: authMocks.signOutUser,
    subscribeToAuthState: authMocks.subscribeToAuthState,
  };
});

const renderGate = (onAuthUserChange?: Parameters<typeof AuthProvider>[0]['onAuthUserChange']) =>
  render(
    <AuthProvider onAuthUserChange={onAuthUserChange}>
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

  it('shows Username and Password, not Email, for signed-out users', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    expect(await screen.findByRole('heading', { name: 'Parent Companion' })).toBeTruthy();
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
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

  it('maps School to the internal Firebase email for sign in', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    await userEvent.type(screen.getByLabelText('Username'), 'School');
    await userEvent.type(screen.getByLabelText('Password'), 'family-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(authMocks.signIn).toHaveBeenCalledWith('school@parentcompanion.app', 'family-pass-1');
  });

  it('accepts the family username case-insensitively', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    await userEvent.type(screen.getByLabelText('Username'), '  sChOoL  ');
    await userEvent.type(screen.getByLabelText('Password'), 'family-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(authMocks.signIn).toHaveBeenCalledWith('school@parentcompanion.app', 'family-pass-1');
  });

  it('rejects invalid usernames before calling Firebase', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    await userEvent.type(screen.getByLabelText('Username'), 'Home');
    await userEvent.type(screen.getByLabelText('Password'), 'family-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert').textContent).toBe('Use the family username: School.');
    expect(authMocks.signIn).not.toHaveBeenCalled();
  });

  it('shows a friendly error for invalid login', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });
    authMocks.signIn.mockRejectedValue({ code: 'auth/invalid-credential' });

    renderGate();

    await userEvent.type(screen.getByLabelText('Username'), 'School');
    await userEvent.type(screen.getByLabelText('Password'), 'bad-family-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The username or password is incorrect.'
    );
    expect(screen.getByRole('alert').textContent).not.toContain('auth/');
  });

  it('switches between sign-in and create-family-account modes', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();
    await userEvent.click(
      screen.getByRole('button', { name: 'First time here? Create Family Account' })
    );

    expect(screen.getByRole('heading', { name: 'Create Family Account' })).toBeTruthy();
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(screen.queryByLabelText('Confirm password')).toBeNull();
  });

  it('maps School to the internal Firebase email for signup', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    await userEvent.click(
      screen.getByRole('button', { name: 'First time here? Create Family Account' })
    );
    await userEvent.type(screen.getByLabelText('Username'), 'School');
    await userEvent.type(screen.getByLabelText('Password'), ' family-pass-1 ');
    await userEvent.type(screen.getByLabelText('Confirm password'), ' family-pass-1 ');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(authMocks.createAccount).toHaveBeenCalledWith(
      'school@parentcompanion.app',
      ' family-pass-1 '
    );
  });

  it('blocks account creation when passwords do not match', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();
    await userEvent.click(
      screen.getByRole('button', { name: 'First time here? Create Family Account' })
    );
    await userEvent.type(screen.getByLabelText('Username'), 'School');
    await userEvent.type(screen.getByLabelText('Password'), 'family-pass-1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different-pass');
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
    await userEvent.click(
      screen.getByRole('button', { name: 'First time here? Create Family Account' })
    );
    await userEvent.type(screen.getByLabelText('Username'), 'School');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert').textContent).toBe(
      'Choose a password with at least 6 characters.'
    );

    authMocks.createAccount.mockRejectedValue({ code: 'auth/email-already-in-use' });
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Password'), 'family-pass-1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'family-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The family account already exists. Please sign in.'
    );
  });

  it('does not render verification or UID-copy UI', async () => {
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate();

    expect(await screen.findByLabelText('Username')).toBeTruthy();
    expect(screen.queryByText('Verify your email')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy User ID' })).toBeNull();
  });

  it('shows access denied without UID-copy instructions after permission is denied', async () => {
    useAppStore.setState({ syncStatus: 'permissionDenied' });
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback({ uid: 'family-uid', email: 'school@parentcompanion.app' });
      return vi.fn();
    });

    renderGate();

    expect(await screen.findByRole('heading', { name: 'Access not available' })).toBeTruthy();
    expect(screen.queryByText('family-uid')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy User ID' })).toBeNull();
    expect(screen.queryByText('Planner loaded')).toBeNull();
  });

  it('signs out from access denied', async () => {
    useAppStore.setState({ syncStatus: 'permissionDenied' });
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback({ uid: 'family-uid', email: 'school@parentcompanion.app' });
      return vi.fn();
    });

    renderGate();

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(authMocks.signOutUser).toHaveBeenCalledTimes(1);
  });

  it('does not notify the sync controller while signed out', async () => {
    const onAuthUserChange = vi.fn();
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    renderGate(onAuthUserChange);

    await screen.findByLabelText('Username');
    expect(onAuthUserChange).toHaveBeenCalledWith(null);
  });

  it('shows the planner for a signed-in family account', async () => {
    const onAuthUserChange = vi.fn();
    useAppStore.setState({ syncStatus: 'synced' });
    authMocks.subscribeToAuthState.mockImplementation((callback) => {
      callback({ uid: 'family-uid', email: 'school@parentcompanion.app' });
      return vi.fn();
    });

    renderGate(onAuthUserChange);

    expect(await screen.findByText('Planner loaded')).toBeTruthy();
    expect(onAuthUserChange).toHaveBeenCalledWith({
      uid: 'family-uid',
      email: 'school@parentcompanion.app',
    });
    expect(screen.queryByText('Verify your email')).toBeNull();
    expect(screen.queryByText('Access not available')).toBeNull();
  });
});
