import { mapStyle } from '../util/mapStyle.ts';
import {
  GeolocateControl,
  Map,
  type MapRef,
  NavigationControl,
  Source,
  Layer,
} from 'react-map-gl/maplibre';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, Polygon, LineString } from 'geojson';
import { MAPBOXDRAW_DEFAULT_CONSTRUCTOR } from '../util/MAPBOXDRAW_DEFAULT_CONSTRUCTOR.tsx';
import type { IControl } from 'maplibre-gl';
import usePrevious from '../util/usePrevious.tsx';
import maplibregl from 'maplibre-gl';

type EditableMapEventType = 'editableMap.mapModeChange';

interface EditableMapModeEvent {
  type: EditableMapEventType;
}

export interface EditableMapModeChangeEvent extends EditableMapModeEvent {
  prevMode: MapModes;
  mode: MapModes;
  type: 'editableMap.mapModeChange';
}

export type EditableMapCallbacks = {
  onEditableMapModeChange?: (e: EditableMapModeChangeEvent) => void;
};

export type EditableMapProps = EditableMapCallbacks & {};

export type MapModes = MapMode[keyof MapMode];

export type EditableMapHandle = {
  addFeatures: (features: Feature[]) => void;
  currentFeature: () => Feature | null;
  drawFeature: () => void;
  removeFeature: (id: string) => void;
  zoomToFeature: (id: string) => void;
};

export interface MapMode {
  Drawing: 'drawing';
  Editing: 'editing';
  Viewing: 'viewing';
}

const EditableMap = forwardRef<EditableMapHandle, EditableMapProps>((props, ref) => {
  const mapRef = useRef<null | MapRef>(null);

  const [mapMode, setMapMode] = useState<MapModes>('viewing');
  const prevMode = usePrevious<MapModes>(mapMode, mapMode);
  const [drawTool, setDrawTool] = useState<null | MapboxDraw>(null);

  const [features, setFeatures] = useState({} as Record<string, Feature>);
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);

  const onMapboxDrawUpdate = useCallback((e: { features: Feature[]; type: string }) => {
    setFeatures(currFeatures => {
      const newFeatures = { ...currFeatures };
      for (const f of e.features) {
        newFeatures[f.id as string] = f;
      }
      return newFeatures;
    });
  }, []);
  const onMapboxDrawDelete = useCallback((e: { features: Feature[] }) => {
    setFeatures(currFeatures => {
      const newFeatures = { ...currFeatures };
      for (const f of e.features) {
        delete newFeatures[f.id as string];
      }
      return newFeatures;
    });
  }, []);

  const emitChangeMapModeEvent = useCallback(
    (prevMode: MapModes, newMode: MapModes) => {
      if (prevMode === newMode) {
        return;
      }

      const { onEditableMapModeChange } = props;
      if (onEditableMapModeChange) {
        onEditableMapModeChange({
          prevMode: prevMode,
          mode: newMode,
          type: 'editableMap.mapModeChange',
        });
      }
    },
    [props]
  );

  const onMapboxDrawSelection = useCallback((e: { features: Feature[]; type: string }) => {
    if (e.features && e.features.length === 1) {
      setMapMode('editing');
      setCurrentFeature(e.features[0]);
    } else {
      setMapMode('viewing');
      setCurrentFeature(null);
    }
  }, []);
  const mapBoxDrawDefaultOnAdd = useCallback(
    (map: MapRef | null): void => {
      map?.on('draw.create', onMapboxDrawUpdate);
      map?.on('draw.update', onMapboxDrawUpdate);
      map?.on('draw.delete', onMapboxDrawDelete);
      map?.on('draw.selectionchange', onMapboxDrawSelection);
    },
    [onMapboxDrawDelete, onMapboxDrawSelection, onMapboxDrawUpdate]
  );
  // const mapBoxDrawDefaultOnRemove = useCallback(
  //   (map: MapRef | null): void => {
  //     map?.off("draw.create", onUpdate);
  //     map?.off("draw.update", onUpdate);
  //     map?.off("draw.delete", onDelete);
  //   },
  //   [onDelete, onUpdate],
  // );

  const drawFeature = useCallback(() => {
    setMapMode('drawing');

    if (drawTool === null) {
      const mapBoxDraw = new MapboxDraw(MAPBOXDRAW_DEFAULT_CONSTRUCTOR);
      mapBoxDrawDefaultOnAdd(mapRef.current);
      mapRef.current?.addControl(mapBoxDraw as unknown as IControl, 'top-left');
      setDrawTool(mapBoxDraw);
      mapBoxDraw.changeMode('draw_polygon');
    } else {
      (drawTool as unknown as MapboxDraw).changeMode('draw_polygon');
    }
  }, [drawTool, mapBoxDrawDefaultOnAdd]);

  const removeFeature = useCallback(
    (id: string) => {
      if (drawTool) {
        const newFeatures = { ...features };
        delete newFeatures[id];
        setFeatures(newFeatures);

        drawTool.delete([id]);

        const noFeatures = Object.values(newFeatures).length === 0;
        if (noFeatures) {
          setMapMode('viewing');
        }
      }
    },
    [drawTool, features]
  );

  const featuresArrayToRecord = (features: Feature[]): Record<string, Feature> => {
    return features.reduce(
      (acc, feature) => {
        if (feature.id !== undefined && feature.id !== null) {
          acc[String(feature.id)] = feature;
        }
        return acc;
      },
      {} as Record<string, Feature>
    );
  };

  const addFeatures = (features: Feature[]) => {
    setFeatures(featuresArrayToRecord(features));
    if (drawTool == null) {
      const mapBoxDraw = new MapboxDraw(MAPBOXDRAW_DEFAULT_CONSTRUCTOR);
      mapBoxDrawDefaultOnAdd(mapRef.current);
      mapRef.current?.addControl(mapBoxDraw as unknown as IControl, 'top-left');
      mapBoxDraw.add(features[0]);
      mapBoxDraw.add(features[1]);
      setDrawTool(mapBoxDraw);
    }
  };

  useEffect(() => {
    emitChangeMapModeEvent(prevMode, mapMode);
  }, [emitChangeMapModeEvent, mapMode, prevMode]);

  // Create route line between stops
  const createRouteLineString = useCallback((): Feature<LineString> | null => {
    const featureArray = Object.values(features);
    if (featureArray.length < 2) return null;

    // Calculate centroids of each polygon
    const coordinates: [number, number][] = featureArray.map(feature => {
      if (feature.geometry.type !== 'Polygon') return [0, 0];

      const coords = feature.geometry.coordinates[0];
      let totalLng = 0,
        totalLat = 0;
      coords.forEach(coord => {
        totalLng += coord[0];
        totalLat += coord[1];
      });
      return [totalLng / coords.length, totalLat / coords.length];
    });

    return {
      type: 'Feature',
      properties: { type: 'route' },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };
  }, [features]);

  const routeLine = createRouteLineString();

  useImperativeHandle(ref, () => ({
    addFeatures,
    currentFeature: () => currentFeature,
    drawFeature,
    removeFeature,
    zoomToFeature: (id: string) => {
      const feature = features[id] as Feature<Polygon>;

      if (!feature || feature.geometry.type !== 'Polygon') return;

      const coords = feature.geometry.coordinates.flat(1) as [number, number][];
      const firstCoord = coords[0];
      const bounds = new maplibregl.LngLatBounds(firstCoord, firstCoord);

      // Extend bounds
      coords.forEach(coord => bounds.extend(coord));

      mapRef.current?.fitBounds(bounds, { padding: 60 });
    },
  }));

  // Get feature array and determine colors
  const featureArray = Object.values(features);
  const getFeatureColor = (index: number) => {
    if (featureArray.length === 0) return '#2196F3';
    if (index === 0) return '#4CAF50'; // Green for departure/start
    if (index === featureArray.length - 1) return '#f44336'; // Red for destination/end
    return '#2196F3'; // Blue for intermediate stops
  };

  return (
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

      {/* Render flexible areas with improved styling */}
      {featureArray.map((feature, index) => {
        const color = getFeatureColor(index);
        return (
          <Source key={`flexible-area-${feature.id}`} type="geojson" data={feature}>
            <Layer
              id={`flexible-area-fill-${feature.id}`}
              type="fill"
              paint={{
                'fill-color': color,
                'fill-opacity': 0.2,
              }}
            />
            <Layer
              id={`flexible-area-outline-${feature.id}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': 3,
              }}
            />
          </Source>
        );
      })}

      {/* Route Line */}
      {routeLine && (
        <Source type="geojson" data={routeLine}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              'line-color': '#FF9800',
              'line-width': 4,
              'line-dasharray': [2, 2],
            }}
          />
        </Source>
      )}
    </Map>
  );
});

export default EditableMap;
