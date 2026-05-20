import { useCallback } from 'react';
import { useConfig } from '../../../contexts/ConfigContext.tsx';
import api from '../../../shared/api/api.tsx';
import type { Position } from 'geojson';

export const useStreetRoute = () => {
  const config = useConfig();
  return useCallback(
    (from: Position, to: Position, dateTime: string) =>
      api(config).getStreetRoute(from, to, dateTime),
    [config]
  );
};
