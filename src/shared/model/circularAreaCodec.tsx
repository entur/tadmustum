import type { Position } from 'geojson';
import type { CircularArea } from './CircularArea.tsx';

// SIRI-ET's DepartureStopAssignment.expectedFlexibleArea has no Point variant,
// so point stops are encoded as a CircularArea with this sentinel radius.
// Decode is the inverse: radius is intentionally dropped on read because the
// domain has no notion of a stop radius. If the protocol gains a Point
// variant, replace both sides here and delete the sentinel.
const POINT_STOP_RADIUS_M = 1;

export const encodePointAsCircularArea = ([lng, lat]: Position): CircularArea => ({
  longitude: lng,
  latitude: lat,
  radius: POINT_STOP_RADIUS_M,
});

export const decodeCircularAreaAsPoint = (area: CircularArea): Position => [
  area.longitude,
  area.latitude,
];
