import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext.tsx';
import { useAuth } from 'react-oidc-context';
import api from '../api/api.tsx';
import { useNoAccess } from '../../contexts/NoAccessContext.tsx';

type CodespaceAuthority = {
  id: string;
  name: string;
};

type Permission = 'VIEW_CARPOOLING_DATA' | 'ADMIN_CARPOOLING_DATA';

type Codespace = {
  id: string;
  permissions: Permission[];
};

export const useAuthorities: () => {
  authorities: CodespaceAuthority[];
  adminAuthorities: CodespaceAuthority[];
  allowedCodespaces: Codespace[];
  isLoading: boolean;
  error: string | null;
} = () => {
  const auth = useAuth();
  const config = useConfig();
  const [codespaceAuthorities, setCodespaceAuthorities] = useState<CodespaceAuthority[]>([]);
  const [allowedCodespaces, setAllowedCodespaces] = useState<Codespace[]>([]);
  // Callers need to tell "still resolving" apart from "resolved to nothing" —
  // otherwise an empty `authorities` is indistinguishable from a failure and they
  // can only wait forever. `isLoading` starts true because the first run is
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

    const fetchAuthorities = async () => {
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
      const allowedCodespaces: Codespace[] = userContext.allowedCodespaces;

      const noOrganizations = allowedCodespaces.length <= 0;
      if (noOrganizations) {
        triggerNoAccess();
      } else {
        const response = await api(config).getAuthorities();
        const authorities = response?.data?.authorities;

        if (!authorities) {
          throw response instanceof Error
            ? response
            : new Error('The server returned no authorities.');
        }

        if (!(authorities.length > 0)) {
          triggerNoAccess();
        } else {
          setAllowedCodespaces(allowedCodespaces);
          // Authority ids look like `<codespace>:Authority:<X>`; key by the
          // codespace prefix so we can look them up by codespace.id.
          const orgByCodespace: Map<string, CodespaceAuthority> = new Map(
            authorities.map((org: CodespaceAuthority) => [org.id.split(':')[0], org])
          );

          setCodespaceAuthorities(
            allowedCodespaces.map(codespace => {
              const existing = orgByCodespace.get(codespace.id);

              return existing
                ? // This awkwardness is because we resolve the name of the codespace in OTP in lieu of an authoritative data owner
                  { id: existing.id, name: existing.name }
                : // The following works for ENT who are ENT:Authority:ENT, but other like ATB have a numerical part as the last segment of their ID.
                  { id: `${codespace.id}:Authority:${codespace.id}`, name: codespace.id };
            })
          );
        }
      }
    };

    // Without this catch the rejection is swallowed: `authorities` stays empty,
    // `triggerNoAccess` is never reached, and callers are left waiting on a
    // result that will never arrive.
    fetchAuthorities()
      .catch(err => {
        const fallback = 'Could not load your authorities.';
        setError(err instanceof Error ? err.message : typeof err === 'string' ? err : fallback);
      })
      .finally(() => setIsLoading(false));
  }, [auth, config, triggerNoAccess]);

  // Codespaces with write permission. Use this for surfaces that lead to a
  // mutation (creating a trip, booking a ride) so the user doesn't see options
  // that would only fail on submit with a 403 from the server.
  // Memoized: otherwise a fresh array on every render causes effects that list
  // adminAuthorities in their deps to refire each render and loop with setValue.
  const adminAuthorities = useMemo(() => {
    const adminCodespaceIds = new Set(
      allowedCodespaces.filter(c => c.permissions.includes('ADMIN_CARPOOLING_DATA')).map(c => c.id)
    );
    return codespaceAuthorities.filter(a => adminCodespaceIds.has(a.id.split(':')[0]));
  }, [allowedCodespaces, codespaceAuthorities]);

  return {
    authorities: codespaceAuthorities,
    adminAuthorities,
    allowedCodespaces,
    isLoading,
    error,
  };
};
