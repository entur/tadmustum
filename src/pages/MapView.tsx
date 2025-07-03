import { useMemo, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useStopsGeoJSON } from '../hooks/useStopsGeoJSON';
import { useStopsSource } from '../hooks/useStopsSource';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import { useMapInteraction } from '../hooks/useMapInteraction';
import { useMapSearch } from '../hooks/useMapSearch';
import { useMapFlyTo } from '../hooks/useMapFlyTo';
import { useMapCore } from '../hooks/useMapCore';
import { useBodyOverflowLock } from '../hooks/useBodyOverflowLock';
import { useEditing } from '../contexts/EditingContext.tsx';
import { createMapStyle, LAYER_ID_STOPS_ICON, LAYER_ID_STOPS_CIRCLE } from '../map/mapStyle';
import { Sidebar } from '../components/sidebar/Sidebar.tsx';
import { ToggleButton } from '../components/sidebar/ToggleButton.tsx';
import { MapContainer } from '../components/map/MapContainer.tsx';
import { MapControls } from '../components/map/MapControls.tsx';
import { LayerControl } from '../components/map/LayerControl';
import { RegisterIcons } from '../map/RegisterIcons';
import MapContextMenu from '../components/map/MapContextMenu.tsx';
import StopPlaceDetailDialog from '../components/map/StopPlaceDetailDialog.tsx';

export default function MapView() {
  const theme = useTheme();
  const mapStyle = useMemo(() => createMapStyle(theme), [theme]);

  const { reactMapRef, rawMapRef, mapLoaded, cursor, handleMapLoad, handleMouseMove } =
    useMapCore();

  const { geojson: stopsGeoJSON, loading: geoJsonLoading, error: geoJsonError } = useStopsGeoJSON();
  const { width, collapsed, setIsResizing, toggle } = useResizableSidebar(300, true);
  useBodyOverflowLock();

  const { editingStopPlaceId } = useEditing();
  const prevEditingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingStopPlaceId && !prevEditingIdRef.current) {
      if (collapsed) {
        toggle();
      }
    }
    prevEditingIdRef.current = editingStopPlaceId;
  }, [editingStopPlaceId, collapsed, toggle]);

  const {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
    selectedFeature,
    handleMapClick,
    handleCloseDialog,
  } = useMapInteraction();
  useMapSearch(stopsGeoJSON, geoJsonLoading);
  useMapFlyTo(reactMapRef, mapLoaded, stopsGeoJSON);
  useStopsSource(rawMapRef, stopsGeoJSON, geoJsonLoading, geoJsonError);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100dvh - 64px)',
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
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          cursor={cursor}
          interactiveLayerIds={[LAYER_ID_STOPS_ICON, LAYER_ID_STOPS_CIRCLE]}
        >
          {mapLoaded && (
            <>
              <RegisterIcons />
              <MapControls />
              <LayerControl />
            </>
          )}
        </MapContainer>
      </Box>
      {contextMenu && <MapContextMenu contextMenu={contextMenu} onClose={handleCloseContextMenu} />}
      <StopPlaceDetailDialog
        open={Boolean(selectedFeature)}
        onClose={handleCloseDialog}
        featureProperties={selectedFeature}
      />
    </Box>
  );
}
