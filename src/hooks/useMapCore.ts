import { useState, useRef, useCallback } from 'react';
import type { MapRef as ReactMapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { Map as MaplibreMap, MapLibreEvent } from 'maplibre-gl';

export function useMapCore() {
  const reactMapRef = useRef<ReactMapRef | null>(null);
  const rawMapRef = useRef<MaplibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cursor, setCursor] = useState<string>('');

  const handleMapLoad = useCallback((evt: MapLibreEvent) => {
    rawMapRef.current = evt.target as MaplibreMap;
    setMapLoaded(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const newCursor = e.features && e.features.length > 0 ? 'pointer' : '';
      if (newCursor !== cursor) {
        setCursor(newCursor);
      }
    },
    [cursor]
  );

  return {
    reactMapRef,
    rawMapRef,
    mapLoaded,
    cursor,
    handleMapLoad,
    handleMouseMove,
  };
}
