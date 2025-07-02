import { useCallback, useEffect } from 'react';
import { useSearch } from '../components/search';
import type { SearchResultItem } from '../components/search/searchTypes';
import type { FeatureCollection, GeoJsonProperties } from 'geojson';

export function useMapSearch(stopsGeoJSON: FeatureCollection | null, geoJsonLoading: boolean) {
  const { setActiveSearchContext, registerSearchFunction } = useSearch();

  const searchMapFeatures = useCallback(
    async (query: string, filters: string[]): Promise<SearchResultItem[]> => {
      if (geoJsonLoading || !stopsGeoJSON?.features) return [];
      const lowerQuery = query.toLowerCase();

      const results = stopsGeoJSON.features
        .filter(feature => {
          const nameMatch = feature.properties?.name?.toLowerCase().includes(lowerQuery);
          const typeMatch =
            filters.length === 0 ||
            (feature.properties && filters.includes(feature.properties.icon));
          return !!nameMatch && typeMatch;
        })
        .map(feature => ({
          id: String(feature.properties!.id),
          name: String(feature.properties!.name),
          type: 'map' as const,
          coordinates:
            feature.geometry.type === 'Point'
              ? (feature.geometry.coordinates as [number, number])
              : undefined,
          originalData: feature.properties,
        }));

      type MapSearchResultWithCoords = {
        id: string;
        name: string;
        type: 'map';
        coordinates: [number, number];
        originalData: GeoJsonProperties;
      };

      return results.filter((r): r is MapSearchResultWithCoords => Boolean(r.coordinates));
    },
    [geoJsonLoading, stopsGeoJSON]
  );

  useEffect(() => {
    setActiveSearchContext('map');
    registerSearchFunction('map', searchMapFeatures);
    return () => {
      registerSearchFunction('map', null);
    };
  }, [setActiveSearchContext, registerSearchFunction, searchMapFeatures]);
}
