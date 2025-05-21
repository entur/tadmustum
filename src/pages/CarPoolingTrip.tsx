import { useEffect, useState } from "react";
import StaticMap, {
  GeolocateControl,
  NavigationControl,
} from "react-map-gl/maplibre";
import { mapStyle } from "./mapStyle";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box, IconButton, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import CarPoolingTripData from "./CarPoolingTripData.tsx";
import DeckGL from "@deck.gl/react";
import {
  EditableGeoJsonLayer,
  ViewMode,
  type FeatureCollection,
  type FeatureOf,
  type Polygon,
  //DrawPolygonMode,
} from "@deck.gl-community/editable-layers";
// @ts-expect-error EditableGeojsonLayerProps is there, it's just not exposed in index for some reason
import type { EditableGeojsonLayerProps } from "@deck.gl-community/editable-layers/dist/editable-layers/editable-geojson-layer";

export default function CarPoolingTrip() {
  const theme = useTheme();

  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mode] = useState(() => ViewMode);

  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([0]);
  const [departureStop, setDepatureStop] = useState<FeatureOf<Polygon> | null>({
    type: "Feature",
    id: "departureStop",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [10.813701152801514, 59.90490269568961],
          [10.813824534416199, 59.905002222436366],
          [10.818298459053041, 59.90387782183805],
          [10.818470120429994, 59.90393162177695],
          [10.81859886646271, 59.903902031821346],
          [10.818480849266054, 59.903821331808345],
          [10.818260908126833, 59.903805191782205],
          [10.813701152801514, 59.90490269568961],
        ],
      ],
    },
  });
  const [arrivalStop, setArrivalStop] = useState<FeatureOf<Polygon> | null>({
    type: "Feature",
    id: "arrivalStop",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [10.198048353195192, 59.744999037838035],
          [10.197742581367494, 59.744653070138405],
          [10.197254419326784, 59.74476388830704],
          [10.197045207023622, 59.7446233383721],
          [10.197629928588867, 59.74445846173351],
          [10.197780132293703, 59.744542251602304],
          [10.197908878326418, 59.74463955570244],
          [10.198810100555422, 59.744396294920904],
          [10.198960304260256, 59.744482787846074],
          [10.198627710342409, 59.74456928054744],
          [10.19883155822754, 59.74479902569844],
          [10.198048353195192, 59.744999037838035],
        ],
      ],
    },
  });
  const [geoJson, setGeoJson] = useState({
    type: "FeatureCollection",
    features: [departureStop, arrivalStop],
  } as FeatureCollection);
  const [modeConfig] = useState({});

  const removeFeature = (feature: FeatureOf<Polygon>) => {
    const feautures = geoJson.features.filter((f) => f.id !== feature.id);
    setGeoJson({
      ...geoJson,
      features: feautures,
    });
  };

  const handleDeparteStopChange = (newValue: FeatureOf<Polygon> | null) => {
    if (newValue == null && departureStop != null) {
      removeFeature(departureStop);
    }
    setDepatureStop(newValue);
  };

  const handleArrivalStopChange = (newValue: FeatureOf<Polygon> | null) => {
    if (newValue == null && arrivalStop != null) {
      removeFeature(arrivalStop);
    }
    setArrivalStop(newValue);
  };

  const layer = new EditableGeoJsonLayer({
    data: geoJson,
    mode,
    modeConfig,
    selectedFeatureIndexes,
    onEdit: (updatedData: FeatureCollection) => {
      setGeoJson(updatedData);
    },
  } as EditableGeojsonLayerProps<FeatureCollection>);

  //const modes = [{ mode: DrawPolygonMode }];

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
          departureStop={departureStop}
          arrivalStop={arrivalStop}
          onSetDepartureStop={handleDeparteStopChange}
          onSetArrivalStop={handleArrivalStopChange}
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
        <DeckGL
          initialViewState={{
            longitude: 10.813701152801514,
            latitude: 59.90490269568961,
            zoom: 8,
          }}
          controller={{
            doubleClickZoom: false,
          }}
          layers={[layer]}
          getCursor={(state): "grabbing" | "grab" => {
            const cursor = layer.getCursor(state);
            return cursor == null ? "grab" : cursor;
          }}
          onClick={(info) => {
            if (mode == ViewMode) {
              if (info) {
                setSelectedFeatureIndexes([info.index]);
              } else {
                setSelectedFeatureIndexes([]);
              }
            }
          }}
        >
          <StaticMap mapStyle={mapStyle}>
            <NavigationControl position="bottom-right" />
            <GeolocateControl position="bottom-right" />
          </StaticMap>
        </DeckGL>
      </Box>
    </Box>
  );
}
