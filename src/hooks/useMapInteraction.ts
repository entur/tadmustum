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
  // 1. Add state for the selected feature dialog
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

  // 2. Add handlers for the map click and dialog close actions
  const handleMapClick = (event: MapLayerMouseEvent) => {
    // If context menu is open, a click should just close it.
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
    // 3. Export the new state and handlers
    selectedFeature,
    handleMapClick,
    handleCloseDialog,
  };
}
