import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, IconButton, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import FlexTourData, { type FlexTourDataHandle } from './components/FlexTourData.tsx';
import EditableMap, { type EditableMapHandle } from '../../shared/components/EditableMap.tsx';
import type { RouteLegGeometries } from '../../shared/api/routeLegChain.tsx';
import { TRONDHEIM_FLEX_LINE } from './model/trondheimFlexLine.tsx';

/**
 * Page for building a flex vehicle's booked tour: the form in a resizable sidebar next to the
 * map the tour's stops are placed on. Mirrors the plan-trip layout, but opens over the flex
 * line's service area rather than Oslo.
 */
export default function FlexTour() {
  const theme = useTheme();

  const editableMapRef = useRef<EditableMapHandle>(null);
  const dataHandle = useRef<FlexTourDataHandle>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [routeGeometry, setRouteGeometry] = useState<RouteLegGeometries>(null);

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
        <FlexTourData
          ref={dataHandle}
          onAddFlexibleStop={() => editableMapRef.current?.drawFeature()}
          onRemoveFlexibleStop={id => editableMapRef.current?.removeFeature(id)}
          onRemoveAllFlexibleStops={() => editableMapRef.current?.removeAllFeatures()}
          onZoomToFeature={id => editableMapRef.current?.zoomToFeature(id)}
          onZoomToAllFeatures={() => editableMapRef.current?.zoomToAllFeatures()}
          onRouteGeometryChange={setRouteGeometry}
        />
      </Box>

      {!collapsed && (
        <Box
          onMouseDown={() => setIsResizing(true)}
          className="resizer"
          sx={{ backgroundColor: theme.palette.divider }}
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
          ref={editableMapRef}
          initialCenter={TRONDHEIM_FLEX_LINE.mapCenter}
          onStopCreated={feature => dataHandle.current?.onStopCreated(feature)}
          onDrawingStateChange={isDrawing => dataHandle.current?.onDrawingStateChange(isDrawing)}
          legGeometries={routeGeometry}
        />
      </Box>
    </Box>
  );
}
