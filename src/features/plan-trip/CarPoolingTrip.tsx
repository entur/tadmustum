import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, IconButton, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import CarPoolingTripData, {
  type CarPoolingTripDataHandle,
} from './components/CarPoolingTripData.tsx';
import { type EditableMapHandle } from '../../shared/components/EditableMap.tsx';
import EditableMap from '../../shared/components/EditableMap.tsx';
import { useParams } from 'react-router-dom';
import type { Feature } from 'geojson';

export default function CarPoolingTrip() {
  const { id } = useParams();
  // Remount on id change so a fresh plan-trip page loads when switching trips
  // (or from editing back to a blank new trip).
  return <CarPoolingTripView key={id ?? 'new'} id={id} />;
}

function CarPoolingTripView({ id }: { id?: string }) {
  const theme = useTheme();

  const editableMapRef = useRef<EditableMapHandle>(null);
  const dataHandle = useRef<CarPoolingTripDataHandle>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [departureStopId, setDepartureStopId] = useState<string | null>(null);
  const [arrivalStopId, setArrivalStopId] = useState<string | null>(null);

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
        <CarPoolingTripData
          tripId={id}
          ref={dataHandle}
          onAddFlexibleStop={() => editableMapRef.current?.drawFeature()}
          onRemoveFlexibleStop={id => editableMapRef.current?.removeFeature(id)}
          onZoomToFeature={(id: string) => editableMapRef.current?.zoomToFeature(id)}
          onZoomToAllFeatures={() => editableMapRef.current?.zoomToAllFeatures()}
          loadedFlexibleStop={(stops: Feature[]) => {
            editableMapRef.current?.addFeatures(stops);
          }}
          onDepartureStopChange={setDepartureStopId}
          onArrivalStopChange={setArrivalStopId}
        />
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
        <EditableMap
          onStopCreated={feature => dataHandle.current?.onStopCreated(feature)}
          onDrawingStateChange={isDrawing => dataHandle.current?.onDrawingStateChange(isDrawing)}
          departureStopId={departureStopId}
          arrivalStopId={arrivalStopId}
          ref={editableMapRef}
        />
      </Box>
    </Box>
  );
}
