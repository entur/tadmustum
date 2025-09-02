import { useConfig } from '../../../contexts/ConfigContext.tsx';
import api from '../../../shared/api/api.tsx';
import { useAuth } from 'react-oidc-context';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';

export const useMutateExtrajourney = () => {
  const config = useConfig();
  const auth = useAuth();

  return async (
    formData: CarPoolingTripDataFormData
  ): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token)
      return {
        error: {
          message: 'Access token missing',
          code: 'ACCESS_TOKEN_MISSING',
          details: 'no auth.user.access_token',
        },
      };

    return await api(config, auth).mutateExtrajourney(formData).apply(this);
  };
};
