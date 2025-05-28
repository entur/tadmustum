import { useRef, useState, useEffect } from 'react';
import { Map, NavigationControl, GeolocateControl, type MapRef } from 'react-map-gl/maplibre';
import { mapStyle } from '../map/mapStyle.ts';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme, Box, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import WorkAreaContent from '../components/WorkAreaContent.tsx';

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const theme = useTheme();

  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Use a type assertion to safely handle the map load event
  const handleMapLoad = (event: { target: unknown }) => {
    // We know from the library that event.target will be compatible with MapRef
    mapRef.current = event.target as MapRef;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || collapsed) return;
      const newWidth = e.clientX;
      const min = 100;
      const max = window.innerWidth * 0.8;
      if (newWidth > min && newWidth < max) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, collapsed]);

  const toggleSidebar = () => {
    setCollapsed(prev => !prev);
  };

  return (
    <Box className="map-container">
      <Box
        className="sidebar"
        sx={{
          width: collapsed ? 0 : sidebarWidth,
          minWidth: collapsed ? 0 : 100,
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
        }}
      >
        <WorkAreaContent />
      </Box>

      {!collapsed && (
        <Box
          onMouseDown={() => setIsResizing(true)}
          className="resizer"
          sx={{
            backgroundColor: theme.palette.divider,
          }}
        />
      )}

      <Box
        onClick={toggleSidebar}
        className="toggle-button"
        sx={{
          left: collapsed ? 0 : sidebarWidth,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <IconButton size="small">{collapsed ? <ChevronRight /> : <ChevronLeft />}</IconButton>
      </Box>

      <Box className="map-box">
        <Map
          initialViewState={{ longitude: 10.0, latitude: 65.5, zoom: 4 }}
          mapStyle={mapStyle}
          onLoad={handleMapLoad}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" />
        </Map>
      </Box>
    </Box>
  );
}
