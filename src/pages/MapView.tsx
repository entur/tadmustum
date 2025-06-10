import { useRef, useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { MapRef as ReactMapRef } from 'react-map-gl/maplibre';
import type { Map as MaplibreMap, MapLibreEvent } from 'maplibre-gl';

import { useStopsGeoJSON } from '../hooks/useStopsGeoJSON';
import { useStopsSource } from '../hooks/useStopsSource';
import { useResizableSidebar } from '../hooks/useResizableSidebar';

import { createMapStyle } from '../map/mapStyle';
import { Sidebar } from '../components/Sidebar';
import { ToggleButton } from '../components/ToggleButton';
import { MapContainer } from '../components/MapContainer';
import { MapControls } from '../components/MapControls';

export default function MapView() {
  const theme = useTheme();
  const mapStyle = createMapStyle(theme);

  const { geojson: stopsGeoJSON, loading, error } = useStopsGeoJSON();

  const reactMapRef = useRef<ReactMapRef | null>(null);
  const rawMapRef = useRef<MaplibreMap | null>(null);

  const { width, collapsed, setIsResizing, toggle } = useResizableSidebar(300);

  const [mapLoadedByComponent, setMapLoadedByComponent] = useState(false);

  useStopsSource(rawMapRef, stopsGeoJSON, loading, error);

  const handleMapLoad = (evt: MapLibreEvent) => {
    rawMapRef.current = evt.target as MaplibreMap;
    setMapLoadedByComponent(true);
  };

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Sidebar
        width={width}
        collapsed={collapsed}
        onMouseDownResize={() => setIsResizing(true)}
        theme={theme}
        toggleCollapse={toggle}
      />
      <ToggleButton collapsed={collapsed} sidebarWidth={width} theme={theme} onClick={toggle} />
      <Box
        className="map-box"
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: collapsed ? 0 : width + 4,
          right: 0,
          zIndex: 1,
        }}
      >
        <MapContainer mapStyle={mapStyle} onLoad={handleMapLoad} mapRef={reactMapRef}>
          {mapLoadedByComponent && <MapControls />}
        </MapContainer>
      </Box>
    </Box>
  );
}
