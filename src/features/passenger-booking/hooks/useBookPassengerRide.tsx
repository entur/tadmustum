import { useCallback } from 'react';
import { useConfig } from '../../../contexts/ConfigContext.tsx';
import { useAuth } from 'react-oidc-context';
import api from '../../../shared/api/api.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import type { PassengerBookingData } from '../../../shared/api/prepareBookingData.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';

export const useBookPassengerRide = () => {
  const config = useConfig();
  const auth = useAuth();

  return useCallback(
    async (
      originalTrip: Extrajourney,
      bookingData: PassengerBookingData
    ): Promise<{ data?: string; error?: AppError }> => {
      if (!auth.user?.access_token) {
        return {
          error: {
            message: 'Access token missing',
            code: 'ACCESS_TOKEN_MISSING',
            details: 'no auth.user.access_token',
          },
        };
      }

      try {
        const result = await api(config, auth).bookPassengerRide(originalTrip, bookingData)();

        return result;
      } catch (error) {
        return {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            code: 'BOOKING_ERROR',
            details: error,
          },
        };
      }
    },
    [auth, config]
  );
};
