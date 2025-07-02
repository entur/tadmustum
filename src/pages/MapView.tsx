import { useRef, useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { MapRef as ReactMapRef } from 'react-map-gl/maplibre';
import type { Map as MaplibreMap, MapLibreEvent } from 'maplibre-gl';
import { useStopsGeoJSON } from '../hooks/useStopsGeoJSON';
import { useStopsSource } from '../hooks/useStopsSource';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import { useMapInteraction } from '../hooks/useMapInteraction';
import { useMapSearch } from '../hooks/useMapSearch';
import { useMapFlyTo } from '../hooks/useMapFlyTo';
import { createMapStyle } from '../map/mapStyle';
import { Sidebar } from '../components/sidebar/Sidebar.tsx';
import { ToggleButton } from '../components/sidebar/ToggleButton.tsx';
import { MapContainer } from '../components/map/MapContainer.tsx';
import { MapControls } from '../components/map/MapControls.tsx';
import { LayerControl } from '../components/map/LayerControl';
import { RegisterIcons } from '../map/RegisterIcons';
import MapContextMenu from '../components/map/MapContextMenu.tsx';

export default function MapView() {
  const theme = useTheme();
  const mapStyle = useMemo(() => createMapStyle(theme), [theme]);

  const reactMapRef = useRef<ReactMapRef | null>(null);
  const rawMapRef = useRef<MaplibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { geojson: stopsGeoJSON, loading: geoJsonLoading, error: geoJsonError } = useStopsGeoJSON();
  const { width, collapsed, setIsResizing, toggle } = useResizableSidebar(300, true);

  const { contextMenu, handleContextMenu, handleCloseContextMenu } = useMapInteraction();
  useMapSearch(stopsGeoJSON, geoJsonLoading);
  useMapFlyTo(reactMapRef, mapLoaded, stopsGeoJSON);

  useStopsSource(rawMapRef, stopsGeoJSON, geoJsonLoading, geoJsonError);

  const handleMapLoad = (evt: MapLibreEvent) => {
    rawMapRef.current = evt.target as MaplibreMap;
    setMapLoaded(true);
  };

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 64px)',
      }}
    >
      <Sidebar
        width={width}
        collapsed={collapsed}
        onMouseDownResize={() => setIsResizing(true)}
        theme={theme}
        toggleCollapse={toggle}
      />
      <ToggleButton collapsed={collapsed} sidebarWidth={width} onClick={toggle} />
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
        <MapContainer
          mapStyle={mapStyle}
          onLoad={handleMapLoad}
          mapRef={reactMapRef}
          onContextMenu={handleContextMenu}
        >
          {mapLoaded && <RegisterIcons />}
          {mapLoaded && <MapControls />}
          {mapLoaded && <LayerControl />}
        </MapContainer>
      </Box>
      {contextMenu && <MapContextMenu contextMenu={contextMenu} onClose={handleCloseContextMenu} />}
    </Box>
  );
}
