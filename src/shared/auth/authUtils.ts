import { useCallback } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import type { IdTokenClaims } from 'oidc-client-ts';
import { useConfig } from '../../contexts/ConfigContext.tsx';

/**
 * Session storage key holding the in-app path to navigate to once the OIDC
 * login round-trip completes. We cannot use the destination path as the OIDC
 * redirect_uri because the provider only whitelists the registered callback
 * URL (the app root), so the destination is carried separately.
 */
export const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect';

/**
 * The signed-in user's display name, or undefined when the token carries none.
 *
 * Preferred source is the Entur-namespaced claim (`preferredNameNamespace`),
 * which an Auth0 action adds to the id token regardless of the requested scope
 * — we ask for `openid` only, so the standard profile claims are not guaranteed
 * to be present. Those are still tried as a fallback for a provider that does
 * issue them. Returns undefined rather than an empty string so callers can omit
 * the name entirely instead of rendering a blank.
 */
export const pickDisplayName = (
  profile: IdTokenClaims | undefined,
  preferredNameNamespace?: string
): string | undefined => {
  if (!profile) return undefined;
  const candidates = [
    preferredNameNamespace ? profile[preferredNameNamespace] : undefined,
    profile.name,
    profile.preferred_username,
    profile.email,
  ];
  const name = candidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== ''
  );
  return name?.trim();
};

export interface Auth {
  isLoading: boolean;
  isAuthenticated: boolean;
  user?: {
    name?: string;
  };
  getAccessToken: () => Promise<string>;
  logout: ({ returnTo }: { returnTo?: string }) => Promise<void>;
  /**
   * Starts the OIDC login flow. `returnUrl` is the in-app path to return to
   * afterwards. Pass `{ replace: true }` to replace the current history entry
   * instead of pushing — used by protected routes so pressing back from the
   * OIDC login page skips the protected URL (which would otherwise re-trigger
   * the redirect and trap the user on the login page).
   */
  login: (returnUrl?: string, options?: { replace?: boolean }) => Promise<void>;
}

export const useAuth = (): Auth => {
  const { isLoading, isAuthenticated, user, signoutRedirect, signinRedirect } = useOidcAuth();

  const { preferredNameNamespace } = useConfig();

  const getAccessToken = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      const accessToken = user?.access_token;
      if (accessToken) {
        resolve(accessToken);
      } else {
        reject();
      }
    });
  }, [user]);

  const logout = useCallback(
    ({ returnTo }: { returnTo?: string }) => {
      {
        return signoutRedirect({ post_logout_redirect_uri: returnTo });
      }
    },
    [signoutRedirect]
  );

  const login = useCallback(
    (returnUrl?: string, options?: { replace?: boolean }) => {
      if (returnUrl) {
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, returnUrl);
      }
      // Always use the registered redirect_uri configured on the AuthProvider;
      // passing an arbitrary current URL would be rejected as a callback mismatch.
      return signinRedirect(options?.replace ? { redirectMethod: 'replace' } : undefined);
    },
    [signinRedirect]
  );

  return {
    isLoading,
    isAuthenticated,
    user: {
      name: pickDisplayName(user?.profile, preferredNameNamespace),
    },
    getAccessToken,
    logout,
    login,
  };
};
