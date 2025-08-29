// Updated useQueryExtraJourney.tsx
import { useCallback } from 'react';
import { useConfig } from '../../../contexts/ConfigContext.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';
import api from '../../../shared/api/api.tsx';
import { useAuth } from 'react-oidc-context'; // Add this import

export const useQueryExtraJourney = () => {
  const config = useConfig();
  const auth = useAuth();

  // Memoize the function to stabilize its reference
  return useCallback(
    async (
      codespace: string,
      authority: string,
      id: string
    ): Promise<{
      data?: {
        codespace: string;
        authority: string;
        extraJourney?: Extrajourney;
      };
      error?: AppError;
    }> => {
      if (!auth.user?.access_token) {
        return {
          error: {
            message: 'Access token missing',
            code: 'ACCESS_TOKEN_MISSING',
            details: 'no auth.user.access_token',
          },
        };
      }

      const trips = await api(config, auth)
        .queryExtraJourney(codespace, authority, true)
        .apply(this);

      if (!trips.error) {
        const filtered = trips.data?.filter(journey => journey.id === id);
        return {
          data: {
            codespace,
            authority,
            extraJourney: filtered?.length ? filtered[0] : undefined,
          },
        };
      } else {
        return {
          error: {
            ...trips.error,
          },
        };
      }
    },
    [auth, config]
  );
};
