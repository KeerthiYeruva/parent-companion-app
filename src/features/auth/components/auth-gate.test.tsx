// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { AuthProvider } from '@/features/auth/components/auth-context';

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  subscribeToAuthState: vi.fn(),
}));

vi.mock('@/features/auth/services/firebase-auth', () => ({
  getFriendlyAuthError: () => 'The email or password is incorrect.',
  signIn: authMocks.signIn,
  signOutUser: vi.fn(),
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
    authMocks.signIn.mockReset();
    authMocks.subscribeToAuthState.mockReset();
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
});
