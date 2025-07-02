import { useState } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { GeoJsonProperties } from 'geojson';

export interface ContextMenuState {
  x: number;
  y: number;
  lng: number;
  lat: number;
}

export function useMapInteraction() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<GeoJsonProperties | null>(null);
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

  const handleMapClick = (event: MapLayerMouseEvent) => {
    if (contextMenu) {
      handleCloseContextMenu();
      return;
    }
    const clickedFeature = event.features && event.features[0];
    if (clickedFeature) {
      setSelectedFeature(clickedFeature.properties);
    }
  };

  const handleCloseDialog = () => {
    setSelectedFeature(null);
  };

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
    selectedFeature,
    handleMapClick,
    handleCloseDialog,
  };
}
