import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext.tsx';
import { useAuth } from 'react-oidc-context';
import api from '../api/api.tsx';
import { useNoAccess } from '../../contexts/NoAccessContext.tsx';

type Permission = 'VIEW_CARPOOLING_DATA' | 'ADMIN_CARPOOLING_DATA';

export type Codespace = {
  id: string;
  permissions: Permission[];
};

// The user's allowed codespaces, from nunamnir's userContext — the single
// authoritative source of who may act where. The codespace is the tenant key
// across the whole pipeline (it is the journey's dataSource); there is no
// authority concept anymore and nothing is fetched from the journey planner.
export const useAllowedCodespaces: () => {
  allowedCodespaces: Codespace[];
  // Bare codespace ids with write permission. Use this for surfaces that lead
  // to a mutation (creating a trip, booking a ride) so the user doesn't see
  // options that would only fail on submit with a 403 from the server.
  adminCodespaces: string[];
  isLoading: boolean;
  error: string | null;
} = () => {
  const auth = useAuth();
  const config = useConfig();
  const [allowedCodespaces, setAllowedCodespaces] = useState<Codespace[]>([]);
  // Callers need to tell "still resolving" apart from "resolved to nothing" —
  // otherwise an empty list is indistinguishable from a failure and they can
  // only wait forever. `isLoading` starts true because the first run is
  // already pending by the time anyone reads it.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { triggerNoAccess } = useNoAccess();

  useEffect(() => {
    if (!auth.user?.access_token) {
      // Auth is still settling. Stay loading; the run that follows the token
      // arriving is what resolves this.
      return;
    }

    const fetchAllowedCodespaces = async () => {
      setError(null);
      // `api` resolves *with* the error object instead of rejecting when a query
      // fails, so a missing payload is the only signal that anything went wrong.
      const userContextResponse = await api(config, auth).getUserContext();
      const userContext = userContextResponse?.data?.['userContext'];
      if (!userContext) {
        throw userContextResponse instanceof Error
          ? userContextResponse
          : new Error('The server returned no user context.');
      }
      const codespaces: Codespace[] = userContext.allowedCodespaces;

      if (codespaces.length <= 0) {
        triggerNoAccess();
      } else {
        setAllowedCodespaces(codespaces);
      }
    };

    // Without this catch the rejection is swallowed: `allowedCodespaces` stays
    // empty, `triggerNoAccess` is never reached, and callers are left waiting on
    // a result that will never arrive.
    fetchAllowedCodespaces()
      .catch(err => {
        const fallback = 'Could not load your codespaces.';
        setError(err instanceof Error ? err.message : typeof err === 'string' ? err : fallback);
      })
      .finally(() => setIsLoading(false));
  }, [auth, config, triggerNoAccess]);

  // Memoized: otherwise a fresh array on every render causes effects that list
  // adminCodespaces in their deps to refire each render and loop with setValue.
  const adminCodespaces = useMemo(
    () =>
      allowedCodespaces.filter(c => c.permissions.includes('ADMIN_CARPOOLING_DATA')).map(c => c.id),
    [allowedCodespaces]
  );

  return {
    allowedCodespaces,
    adminCodespaces,
    isLoading,
    error,
  };
};
