import { useEffect, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../components/search';
import type { MapRef as ReactMapRef } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';

export function useMapFlyTo(
  reactMapRef: RefObject<ReactMapRef | null>,
  mapLoaded: boolean,
  stopsGeoJSON: FeatureCollection | null
) {
  const { searchResults, selectedItem, setSelectedItem, activeSearchContext } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (
      activeSearchContext === 'map' &&
      searchResults.length > 0 &&
      reactMapRef.current &&
      mapLoaded
    ) {
      const firstMapResult = searchResults.find(
        result => result.type === 'map' && result.coordinates
      );

      if (firstMapResult?.coordinates) {
        reactMapRef.current.flyTo({ center: firstMapResult.coordinates, zoom: 18, duration: 1000 });
      }
    }
  }, [searchResults, activeSearchContext, mapLoaded, reactMapRef]);

  useEffect(() => {
    if (selectedItem?.coordinates && reactMapRef.current && mapLoaded) {
      reactMapRef.current.flyTo({
        center: selectedItem.coordinates,
        zoom: 18,
        duration: 1000,
      });
      setSelectedItem(null);
    }
  }, [selectedItem, setSelectedItem, mapLoaded, reactMapRef]);

  useEffect(() => {
    const stopPlaceId = searchParams.get('stopPlaceId');

    if (stopPlaceId && stopsGeoJSON?.features && reactMapRef.current && mapLoaded) {
      const featureToFlyTo = stopsGeoJSON.features.find(f => f.properties?.id === stopPlaceId);

      if (featureToFlyTo && featureToFlyTo.geometry.type === 'Point') {
        reactMapRef.current.flyTo({
          center: featureToFlyTo.geometry.coordinates as [number, number],
          zoom: 18,
          duration: 1000,
        });

        searchParams.delete('stopPlaceId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, stopsGeoJSON, mapLoaded, reactMapRef]);
}
