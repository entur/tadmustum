import { type RefObject, useEffect, useRef } from 'react';
import type { FeatureCollection } from 'geojson';
import { useSearch } from '../components/search';
import type { MapRef } from 'react-map-gl/maplibre';

export function useMapFlyTo(
  mapRef: RefObject<MapRef | null>,
  mapLoaded: boolean,
  geojson: FeatureCollection | null,
  stopPlaceIdFromUrl: string | null
) {
  const { selectedItem } = useSearch();
  const flownToIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mapRef?.current || !mapLoaded) {
      return;
    }

    let targetCoords: [number, number] | undefined;
    let targetId: string | null = null;

    if (selectedItem && selectedItem.type === 'map' && selectedItem.id !== flownToIdRef.current) {
      targetCoords = selectedItem.coordinates;
      targetId = selectedItem.id;
    } else if (stopPlaceIdFromUrl && stopPlaceIdFromUrl !== flownToIdRef.current && geojson) {
      const feature = geojson.features.find(f => f.properties?.id === stopPlaceIdFromUrl);
      if (feature?.geometry.type === 'Point') {
        targetCoords = feature.geometry.coordinates as [number, number];
        targetId = stopPlaceIdFromUrl;
      }
    }

    if (targetCoords && targetId) {
      mapRef.current.flyTo({
        center: targetCoords,
        zoom: 17,
        essential: true,
      });
      flownToIdRef.current = targetId;
    }
  }, [mapRef, mapLoaded, geojson, stopPlaceIdFromUrl, selectedItem]);
}
