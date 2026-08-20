import { useCallback } from 'react';
import { useConfig } from '../../../contexts/ConfigContext.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';
import api from '../../../shared/api/api.tsx';
import { useAuth } from 'react-oidc-context';

// The caller's trips, fetched with nunamnir's argless query (scoped server-side
// to the codespaces the caller may read). Memoized so effects can safely list
// the returned function in their deps. A missing access token resolves with an
// ACCESS_TOKEN_MISSING error (handled inside api.queryExtraJourney) rather than
// throwing.
export const useQueryExtraJourney = () => {
  const config = useConfig();
  const auth = useAuth();

  return useCallback(
    async (): Promise<{ data?: Extrajourney[]; error?: AppError }> =>
      api(config, auth).queryExtraJourney()(),
    [auth, config]
  );
};
