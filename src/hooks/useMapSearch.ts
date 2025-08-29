import { useCallback, useEffect } from 'react';
import { useSearch } from '../components/search';
import type { SearchResultItem, FilterDefinition } from '../components/search/searchTypes';
import type { FeatureCollection, GeoJsonProperties } from 'geojson';

const mapFilters: FilterDefinition[] = [
  { id: 'parentStopPlace', labelKey: 'types.parent', defaultLabel: 'Parent Stop Place' },
  { id: 'railStation', labelKey: 'types.train', defaultLabel: 'Train' },
  { id: 'metroStation', labelKey: 'types.metro', defaultLabel: 'Metro' },
  { id: 'onstreetBus', labelKey: 'types.bus', defaultLabel: 'Bus' },
  { id: 'onstreetTram', labelKey: 'types.tram', defaultLabel: 'Tram' },
  { id: 'ferryStop', labelKey: 'types.ferry', defaultLabel: 'Ferry' },
  { id: 'harbourPort', labelKey: 'types.harbour', defaultLabel: 'Harbour' },
  { id: 'liftStation', labelKey: 'types.lift', defaultLabel: 'Lift' },
];

export function useMapSearch(stopsGeoJSON: FeatureCollection | null, geoJsonLoading: boolean) {
  const { setActiveSearchContext, registerSearchFunction, registerFilterConfig } = useSearch();

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
    registerFilterConfig('map', mapFilters);
    return () => {
      registerSearchFunction('map', null);
      registerFilterConfig('map', null);
    };
  }, [setActiveSearchContext, registerSearchFunction, searchMapFeatures, registerFilterConfig]);
}
