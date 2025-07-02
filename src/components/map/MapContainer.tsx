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
}

export const MapContainer: React.FC<MapContainerProps> = ({
  children,
  mapStyle,
  onLoad,
  mapRef,
  onContextMenu,
}) => {
  return (
    <Map
      ref={mapRef}
      onLoad={onLoad}
      onContextMenu={onContextMenu}
      initialViewState={{
        longitude: 10.75,
        latitude: 59.91,
        zoom: 12,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
    >
      {children}
    </Map>
  );
};
