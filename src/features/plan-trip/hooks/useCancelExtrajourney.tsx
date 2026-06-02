import { useConfig } from '../../../contexts/ConfigContext.tsx';
import api from '../../../shared/api/api.tsx';
import { useAuth } from 'react-oidc-context';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';

export const useCancelExtrajourney = () => {
  const config = useConfig();
  const auth = useAuth();

  return async (
    originalTrip: Extrajourney,
    authority: string
  ): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token)
      return {
        error: {
          message: 'Access token missing',
          code: 'ACCESS_TOKEN_MISSING',
          details: 'no auth.user.access_token',
        },
      };

    return await api(config, auth).cancelExtrajourney(originalTrip, authority).apply(this);
  };
};
