import { useCallback } from 'react';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';
import { useQueryExtraJourney as useQueryExtraJourneys } from '../../planned-trips/hooks/useQueryExtraJourney.tsx';

// One-journey variant of the trips query. nunamnir has no by-id lookup — the
// argless query returns everything the caller may read — so this delegates to
// the list hook and picks the requested journey out of the result client-side.
export const useQueryExtraJourney = () => {
  const queryExtraJourneys = useQueryExtraJourneys();

  return useCallback(
    async (id: string): Promise<{ data?: { extraJourney?: Extrajourney }; error?: AppError }> => {
      const trips = await queryExtraJourneys();
      if (trips.error) {
        return { error: trips.error };
      }
      return { data: { extraJourney: trips.data?.find(journey => journey.id === id) } };
    },
    [queryExtraJourneys]
  );
};
