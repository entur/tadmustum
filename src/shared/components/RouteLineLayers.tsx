import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { Feature, LineString, MultiLineString } from 'geojson';
import type { RouteLegGeometries } from '../api/routeLegChain.tsx';

export interface RouteLineLayersProps {
  // The routed driving path, one [lng, lat] linestring per leg ('failed' when
  // routing failed, null while routing / nothing to draw).
  legGeometries?: RouteLegGeometries;
  // Straight line between the stops, drawn dashed when routing failed.
  fallbackLine: Feature<LineString> | null;
}

// The route line shared by the trip maps: the routed driving path as a solid
// line, the straight fallback line dashed when routing failed, and nothing
// while a route is still being computed (drawing the straight line first and
// snapping to the real route afterwards looks glitchy). Navigation blue over
// a white casing: OSM Carto draws roads in orange/yellow tones, so the route
// needs a hue the basemap never uses, and the casing keeps it readable on top
// of any road.
export default function RouteLineLayers({ legGeometries, fallbackLine }: RouteLineLayersProps) {
  const drivingRouteLine = useMemo((): Feature<MultiLineString> | null => {
    if (!Array.isArray(legGeometries)) return null;
    const legs = legGeometries.filter(leg => leg.length >= 2);
    if (legs.length === 0) return null;
    return {
      type: 'Feature',
      properties: { type: 'route' },
      geometry: { type: 'MultiLineString', coordinates: legs },
    };
  }, [legGeometries]);

  const routeLine = drivingRouteLine ?? (legGeometries === 'failed' ? fallbackLine : null);
  if (!routeLine) return null;

  return (
    <Source type="geojson" data={routeLine}>
      {/* Solid casing also under the dashed fallback — it reads as blue
          dashes on a white band, keeping it visible over any road. */}
      <Layer
        id="route-line-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#FFFFFF', 'line-width': 7 }}
      />
      <Layer
        id="route-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={
          drivingRouteLine
            ? { 'line-color': '#1A73E8', 'line-width': 4.5 }
            : { 'line-color': '#1A73E8', 'line-width': 4, 'line-dasharray': [2, 2] }
        }
      />
    </Source>
  );
}
