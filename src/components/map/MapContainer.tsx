import React, { type ReactNode, type RefObject } from 'react';
import Map, { type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { StyleSpecification, MapLibreEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  children?: ReactNode;
  mapStyle: StyleSpecification;
  onLoad: (evt: MapLibreEvent) => void;
  mapRef: RefObject<MapRef | null>;
  onContextMenu?: (event: MapLayerMouseEvent) => void;
  onClick?: (event: MapLayerMouseEvent) => void;
  // 1. Replace enter/leave with a single mouse move handler
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  interactiveLayerIds?: string[];
  // 2. Add a prop to control the cursor declaratively
  cursor?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  children,
  mapStyle,
  onLoad,
  mapRef,
  onContextMenu,
  onClick,
  // 3. Destructure the new props
  onMouseMove,
  interactiveLayerIds,
  cursor,
}) => {
  return (
    <Map
      ref={mapRef}
      onLoad={onLoad}
      onContextMenu={onContextMenu}
      onClick={onClick}
      // 4. Pass the new props to the Map component
      onMouseMove={onMouseMove}
      cursor={cursor}
      interactiveLayerIds={interactiveLayerIds}
      initialViewState={{
        longitude: 10.75,
        latitude: 59.91,
        zoom: 12,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      // @ts-expect-error The `contextAttributes` prop is valid but may not be in the current type definitions.
      contextAttributes={{
        preserveDrawingBuffer: true,
      }}
    >
      {children}
    </Map>
  );
};
