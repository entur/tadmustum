import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAllowedCodespaces } from './useAllowedCodespaces';

// The hook's own dependencies are mocked so this exercises the hook's contract
// directly: loading/error handling, the no-access trigger, and the memoization
// four consumers' effects rely on for loop-safety.
const { getUserContext, authState } = vi.hoisted(() => ({
  getUserContext: vi.fn(),
  authState: { user: { access_token: 'test-token' } as { access_token: string } | undefined },
}));

vi.mock('react-oidc-context', () => ({
  useAuth: () => authState,
}));

// Stable object: the real useConfig returns the same context value on every
// render, and the hook's effect lists it in its deps.
const { testConfig } = vi.hoisted(() => ({
  testConfig: { 'carpool-messages-api': 'https://api.example.com/graphql' },
}));
vi.mock('../../contexts/ConfigContext.tsx', () => ({
  useConfig: () => testConfig,
}));

vi.mock('../api/api.tsx', () => ({
  default: () => ({ getUserContext }),
}));

const { triggerNoAccess } = vi.hoisted(() => ({ triggerNoAccess: vi.fn() }));
vi.mock('../../contexts/NoAccessContext.tsx', () => ({
  useNoAccess: () => ({ triggerNoAccess }),
}));

const userContextResponse = (allowedCodespaces: unknown) => ({
  data: { userContext: { allowedCodespaces } },
});

describe('useAllowedCodespaces', () => {
  beforeEach(() => {
    getUserContext.mockReset();
    triggerNoAccess.mockReset();
    authState.user = { access_token: 'test-token' };
  });

  it('starts loading, then resolves the codespaces and derives adminCodespaces', async () => {
    getUserContext.mockResolvedValue(
      userContextResponse([
        { id: 'ENT', permissions: ['VIEW_CARPOOLING_DATA', 'ADMIN_CARPOOLING_DATA'] },
        { id: 'MAL', permissions: ['VIEW_CARPOOLING_DATA'] },
      ])
    );

    const { result } = renderHook(() => useAllowedCodespaces());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.allowedCodespaces.map(c => c.id)).toEqual(['ENT', 'MAL']);
    // Only codespaces with the admin permission surface as adminCodespaces.
    expect(result.current.adminCodespaces).toEqual(['ENT']);
    expect(triggerNoAccess).not.toHaveBeenCalled();
  });

  it('keeps adminCodespaces referentially stable across re-renders', async () => {
    // Consumers list adminCodespaces in effect deps (and call setValue from
    // those effects); a fresh array per render would loop them forever.
    getUserContext.mockResolvedValue(
      userContextResponse([{ id: 'ENT', permissions: ['ADMIN_CARPOOLING_DATA'] }])
    );

    const { result, rerender } = renderHook(() => useAllowedCodespaces());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const first = result.current.adminCodespaces;
    rerender();

    expect(result.current.adminCodespaces).toBe(first);
  });

  it('reports an error (and stops loading) when the server returns no user context', async () => {
    getUserContext.mockResolvedValue({});

    const { result } = renderHook(() => useAllowedCodespaces());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('The server returned no user context.');
    expect(result.current.allowedCodespaces).toEqual([]);
    expect(triggerNoAccess).not.toHaveBeenCalled();
  });

  it('triggers the no-access flow when the user holds no codespaces', async () => {
    getUserContext.mockResolvedValue(userContextResponse([]));

    const { result } = renderHook(() => useAllowedCodespaces());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(triggerNoAccess).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.allowedCodespaces).toEqual([]);
  });

  it('stays loading (and does not fetch) while the access token has not arrived', async () => {
    authState.user = undefined;

    const { result } = renderHook(() => useAllowedCodespaces());

    // Give any (wrongly started) fetch a chance to run before asserting.
    await Promise.resolve();
    expect(result.current.isLoading).toBe(true);
    expect(getUserContext).not.toHaveBeenCalled();
  });
});
