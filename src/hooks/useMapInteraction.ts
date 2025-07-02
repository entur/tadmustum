import { useState } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';

export interface ContextMenuState {
  x: number;
  y: number;
  lng: number;
  lat: number;
}

export function useMapInteraction() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = (event: MapLayerMouseEvent) => {
    event.originalEvent.preventDefault();
    setContextMenu({
      x: event.point.x,
      y: event.point.y,
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
  };
}
