import { mapStyle } from '../util/mapStyle.ts';
import {
  GeolocateControl,
  Map,
  type MapRef,
  NavigationControl,
  Source,
  Layer,
  Marker,
} from 'react-map-gl/maplibre';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, Point, LineString } from 'geojson';
import { v4 as uuidv4 } from 'uuid';
import { MAPBOXDRAW_DEFAULT_CONSTRUCTOR } from '../util/MAPBOXDRAW_DEFAULT_CONSTRUCTOR.tsx';
import type { IControl } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import { Box } from '@mui/material';

export type EditableMapCallbacks = {
  onStopCreated?: (feature: Feature) => void;
  onStopUpdated?: (feature: Feature) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
};

export type EditableMapProps = EditableMapCallbacks & {
  departureStopId?: string | null;
  arrivalStopId?: string | null;
};

export type MapModes = MapMode[keyof MapMode];

export type EditableMapHandle = {
  addFeatures: (features: Feature[]) => void;
  drawFeature: () => void;
  removeFeature: (id: string) => void;
  removeAllFeatures: () => void;
  zoomToFeature: (id: string) => void;
  zoomToAllFeatures: () => void;
};

export interface MapMode {
  Drawing: 'drawing';
  Editing: 'editing';
  Viewing: 'viewing';
}

const EditableMap = forwardRef<EditableMapHandle, EditableMapProps>(
  ({ departureStopId, arrivalStopId, ...props }, ref) => {
    const mapRef = useRef<null | MapRef>(null);

    // Tracked as a ref because it's only inspected in event handlers and the
    // value never needs to drive a render.
    const isDrawingRef = useRef<boolean>(false);
    // Ref-based so multiple call sites (drawFeature, addFeatures, onMapClick)
    // can lazily init without racing through async setState.
    const drawToolRef = useRef<MapboxDraw | null>(null);

    const [features, setFeatures] = useState({} as Record<string, Feature>);

    // Mirror latest callbacks; draw handlers are registered once on MapboxDraw
    // and would otherwise close over stale props.
    const callbacksRef = useRef(props);
    useEffect(() => {
      callbacksRef.current = props;
    });

    const onMapboxDrawUpdate = useCallback((e: { features: Feature[]; type: string }) => {
      setFeatures(currFeatures => {
        const newFeatures = { ...currFeatures };
        for (const f of e.features) {
          newFeatures[f.id as string] = f;
        }
        return newFeatures;
      });
      if (e.type === 'draw.create') {
        for (const f of e.features) {
          callbacksRef.current.onStopCreated?.(f);
        }
        isDrawingRef.current = false;
        callbacksRef.current.onDrawingStateChange?.(false);
      } else if (e.type === 'draw.update') {
        for (const f of e.features) {
          callbacksRef.current.onStopUpdated?.(f);
        }
      }
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

    // Cancel paths (Escape, trash control) exit draw_point without firing
    // draw.create, so without this the drawing flag stays stuck true.
    const onMapboxDrawModeChange = useCallback((e: { mode: string }) => {
      if (isDrawingRef.current && e.mode !== 'draw_point') {
        isDrawingRef.current = false;
        callbacksRef.current.onDrawingStateChange?.(false);
      }
    }, []);

    const mapBoxDrawDefaultOnAdd = useCallback(
      (map: MapRef | null): void => {
        map?.on('draw.create', onMapboxDrawUpdate);
        map?.on('draw.update', onMapboxDrawUpdate);
        map?.on('draw.delete', onMapboxDrawDelete);
        map?.on('draw.modechange', onMapboxDrawModeChange);
      },
      [onMapboxDrawDelete, onMapboxDrawUpdate, onMapboxDrawModeChange]
    );
    // const mapBoxDrawDefaultOnRemove = useCallback(
    //   (map: MapRef | null): void => {
    //     map?.off("draw.create", onUpdate);
    //     map?.off("draw.update", onUpdate);
    //     map?.off("draw.delete", onDelete);
    //   },
    //   [onDelete, onUpdate],
    // );

    const ensureDrawTool = useCallback((): MapboxDraw => {
      if (drawToolRef.current !== null) return drawToolRef.current;
      const mapBoxDraw = new MapboxDraw(MAPBOXDRAW_DEFAULT_CONSTRUCTOR);
      mapBoxDrawDefaultOnAdd(mapRef.current);
      mapRef.current?.addControl(mapBoxDraw as unknown as IControl, 'top-left');
      drawToolRef.current = mapBoxDraw;
      return mapBoxDraw;
    }, [mapBoxDrawDefaultOnAdd]);

    const drawFeature = useCallback(() => {
      isDrawingRef.current = true;
      callbacksRef.current.onDrawingStateChange?.(true);
      ensureDrawTool().changeMode('draw_point');
    }, [ensureDrawTool]);

    const removeFeature = useCallback((id: string) => {
      setFeatures(curr => {
        const newFeatures = { ...curr };
        delete newFeatures[id];
        return newFeatures;
      });

      drawToolRef.current?.delete([id]);
    }, []);

    const removeAllFeatures = useCallback(() => {
      setFeatures({});
      drawToolRef.current?.deleteAll();
    }, []);

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
      // Authoritatively sync the draw tool to exactly these features so the
      // stops are editable both on first load and when restored (e.g. reset
      // while editing, after the map was cleared).
      const tool = ensureDrawTool();
      tool.deleteAll();
      features.forEach(feature => tool.add(feature));
    };

    const onMapClick = useCallback(
      (e: { lngLat: { lng: number; lat: number }; point: { x: number; y: number } }) => {
        // Don't interfere with an active draw — MapboxDraw owns the click in draw_point mode.
        if (isDrawingRef.current) return;

        const zoom = mapRef.current?.getZoom() ?? 0;
        if (zoom <= 15) return;

        // Don't interfere with selecting/dragging an existing stop.
        if ((drawToolRef.current?.getFeatureIdsAt(e.point) ?? []).length > 0) return;

        const numStops = (departureStopId ? 1 : 0) + (arrivalStopId ? 1 : 0);
        if (numStops >= 2) return;

        const newFeature: Feature<Point> = {
          id: uuidv4(),
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] },
          properties: {},
        };

        ensureDrawTool().add(newFeature);
        setFeatures(curr => ({ ...curr, [String(newFeature.id)]: newFeature }));
        callbacksRef.current.onStopCreated?.(newFeature);
      },
      [departureStopId, arrivalStopId, ensureDrawTool]
    );

    const featureArray = useMemo(() => {
      return Object.values(features).sort((a, b) => {
        if (String(a.id) === departureStopId) return -1;
        if (String(b.id) === departureStopId) return 1;
        if (String(a.id) === arrivalStopId) return 1;
        if (String(b.id) === arrivalStopId) return -1;
        return 0;
      });
    }, [features, departureStopId, arrivalStopId]);

    // Create route line between stops
    const createRouteLineString = useCallback((): Feature<LineString> | null => {
      if (featureArray.length < 2) return null;

      // Point.coordinates is geojson Position (number[]); we only ever produce
      // 2D coords here, so narrow to [lng, lat] for LineString.
      const coordinates: [number, number][] = featureArray.map(feature => {
        if (feature.geometry.type !== 'Point') return [0, 0];
        return feature.geometry.coordinates as [number, number];
      });

      return {
        type: 'Feature',
        properties: { type: 'route' },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      };
    }, [featureArray]);

    const routeLine = createRouteLineString();

    useImperativeHandle(ref, () => ({
      addFeatures,
      drawFeature,
      removeFeature,
      removeAllFeatures,
      zoomToFeature: (id: string) => {
        const feature = features[id] as Feature<Point>;

        if (!feature || feature.geometry.type !== 'Point') return;

        const [lng, lat] = feature.geometry.coordinates;
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
      },
      zoomToAllFeatures: () => {
        const featureArray = Object.values(features);
        if (featureArray.length === 0) return;

        // Calculate bounds to include all features
        const allCoords: [number, number][] = [];
        featureArray.forEach(feature => {
          if (feature.geometry.type === 'Point') {
            const coords = feature.geometry.coordinates;
            allCoords.push(coords as [number, number]);
          }
        });

        if (allCoords.length === 0) return;

        const firstCoord = allCoords[0];
        const bounds = new maplibregl.LngLatBounds(firstCoord, firstCoord);

        // Extend bounds to include all coordinates
        allCoords.forEach(coord => bounds.extend(coord));

        mapRef.current?.fitBounds(bounds, { padding: 80, duration: 1000 });
      },
    }));

    const getFeatureColor = (featureId: string | number | undefined) => {
      if (featureId === departureStopId) return '#4CAF50';
      if (featureId === arrivalStopId) return '#f44336';
      return '#2196F3';
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
        onClick={onMapClick}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />

        {/* Render flexible areas with improved styling */}
        {featureArray.map(feature => {
          const color = getFeatureColor(feature.id);
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

        {/* Stop Markers — numbered circles matching the booking map. */}
        {featureArray.map((feature, index) => {
          if (feature.geometry.type !== 'Point') return null;

          const [centerLng, centerLat] = feature.geometry.coordinates as [number, number];
          const color = getFeatureColor(feature.id);

          return (
            <Marker key={`marker-${feature.id}`} longitude={centerLng} latitude={centerLat}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '3px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                {index + 1}
              </Box>
            </Marker>
          );
        })}
      </Map>
    );
  }
);

export default EditableMap;
