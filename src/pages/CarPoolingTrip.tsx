import { useCallback, useEffect, useRef, useState } from "react";
import {
  GeolocateControl,
  Map,
  type MapRef,
  NavigationControl,
} from "react-map-gl/maplibre";
import { mapStyle } from "./mapStyle";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box, IconButton, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import CarPoolingTripData from "./CarPoolingTripData.tsx";
import type { Feature } from "geojson";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { MAPBOXDRAW_DEFAULT_CONSTRUCTOR } from "./MAPBOXDRAW_DEFAULT_CONSTRUCTOR.tsx";
import type { IControl } from "maplibre-gl";
import type { CarPoolingMapMode } from "./CarPoolingMapMode.tsx";

export default function CarPoolingTrip() {
  const theme = useTheme();

  const mapRef = useRef<null | MapRef>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  const [drawMode, setDrawMode] = useState<CarPoolingMapMode>("viewing");
  const [drawTool, setDrawTool] = useState<null | MapboxDraw>(null);

  const [features, setFeatures] = useState({} as Record<string, Feature>);
  const [currentFeature, setCurrentFeature] = useState<null | Feature>(null);

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
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
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, collapsed]);
  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  const onMapboxDrawUpdate = useCallback(
    (e: { features: Feature[]; type: string }) => {
      setFeatures((currFeatures) => {
        const newFeatures = { ...currFeatures };
        for (const f of e.features) {
          newFeatures[f.id as string] = f;
        }
        return newFeatures;
      });
    },
    [],
  );
  const onMapboxDrawDelete = useCallback((e: { features: Feature[] }) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures };
      for (const f of e.features) {
        delete newFeatures[f.id as string];
      }
      return newFeatures;
    });
  }, []);
  const onMapboxDrawSelection = useCallback(
    (e: { features: Feature[]; type: string }) => {
      if (e.features && e.features.length === 1) {
        setCurrentFeature(e.features[0]);
        setDrawMode("editing");
      } else {
        setCurrentFeature(null);
        setDrawMode("viewing");
      }
    },
    [],
  );
  const mapBoxDrawDefaultOnAdd = useCallback(
    (map: MapRef | null): void => {
      map?.on("draw.create", onMapboxDrawUpdate);
      map?.on("draw.update", onMapboxDrawUpdate);
      map?.on("draw.delete", onMapboxDrawDelete);
      map?.on("draw.selectionchange", onMapboxDrawSelection);
    },
    [onMapboxDrawDelete, onMapboxDrawSelection, onMapboxDrawUpdate],
  );
  // const mapBoxDrawDefaultOnRemove = useCallback(
  //   (map: MapRef | null): void => {
  //     map?.off("draw.create", onUpdate);
  //     map?.off("draw.update", onUpdate);
  //     map?.off("draw.delete", onDelete);
  //   },
  //   [onDelete, onUpdate],
  // );

  const handleStartAddFlexibleStop = useCallback(() => {
    setDrawMode("drawing");

    if (drawTool === null) {
      const mapBoxDraw = new MapboxDraw(MAPBOXDRAW_DEFAULT_CONSTRUCTOR);
      mapBoxDrawDefaultOnAdd(mapRef.current);
      mapRef.current?.addControl(mapBoxDraw as unknown as IControl, "top-left");
      setDrawTool(mapBoxDraw);
      mapBoxDraw.changeMode("draw_polygon");
    } else {
      (drawTool as unknown as MapboxDraw).changeMode("draw_polygon");
    }
  }, [drawTool, mapBoxDrawDefaultOnAdd]);

  const handleStartRemoveFlexibleStop = useCallback(
    (id: string) => {
      if (drawTool) {
        const newFeatures = { ...features };
        delete newFeatures[id];
        setFeatures(newFeatures);
        drawTool.delete([id]);

        const noFeatures = Object.values(newFeatures).length === 0;
        if (noFeatures) {
          setDrawMode("viewing");
        }
      }
    },
    [drawTool, features],
  );

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
          mapDrawMode={drawMode}
          onAddFlexibleStop={handleStartAddFlexibleStop}
          onRemoveFlexibleStop={handleStartRemoveFlexibleStop}
          onStopCreatedCallback={() => currentFeature}
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
        <IconButton size="small">
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>

      <Box className="map-box">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 10.813701152801514,
            latitude: 59.90490269568961,
            zoom: 8,
          }}
          mapStyle={mapStyle}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" />
        </Map>
      </Box>
    </Box>
  );
}
