import dayjs from 'dayjs';
import type { Position } from 'geojson';
import type { StreetRouteResult } from './journeyPlannerStreetRoute.tsx';

// Plans a single car leg between two points departing at `dateTime`. The
// journey-planner street route (api.getStreetRoute) has this signature.
export type RouteLeg = (
  from: Position,
  to: Position,
  dateTime: string
) => Promise<StreetRouteResult | null>;

// What a map should draw for a routed path: the leg linestrings when routing
// succeeded, 'failed' when the journey planner couldn't route it (the map
// shows its straight-line fallback), or null when there is nothing to draw
// yet (no stops placed, or a route still being computed — drawing the
// straight line first and snapping to the real route afterwards looks bad).
export type RouteLegGeometries = Position[][] | 'failed' | null;

export interface RoutedLegChain {
  // Arrival time at each stop, aligned by index with the input coords;
  // arrivals[0] is the departure time itself.
  arrivals: string[];
  // Street geometry per leg (coords[i] -> coords[i+1]). A leg whose route
  // came back without geometry falls back to the straight segment between its
  // stops, so the chain can always be drawn end-to-end.
  legGeometries: Position[][];
}

// Routes each consecutive leg of a multi-stop sequence in turn and accumulates
// arrival times and street geometries. All-or-nothing: returns null when any leg
// can't be planned, so callers never get a half-routed chain.
//
// `dwellMinutes` is how long the vehicle stands at each stop before driving on,
// so every leg departs at the previous stop's arrival plus the dwell. It applies
// at each stop the vehicle leaves — every stop but the last. Defaults to 0,
// which departs the moment the vehicle arrives; a carpool trip has no dwell, and
// at 0 the leg's departure string is passed through untouched rather than
// round-tripped through a date library.
export async function routeLegChain(
  coords: Position[],
  departureTime: string,
  routeLeg: RouteLeg,
  dwellMinutes: number = 0
): Promise<RoutedLegChain | null> {
  const arrivals: string[] = [departureTime];
  const legGeometries: Position[][] = [];
  const dwell = Number(dwellMinutes) || 0;
  let currentTime = departureTime;
  for (let i = 0; i < coords.length - 1; i++) {
    const departAt =
      dwell > 0 ? dayjs(currentTime).add(dwell, 'minute').toISOString() : currentTime;
    const route = await routeLeg(coords[i], coords[i + 1], departAt);
    if (!route) return null;
    arrivals.push(route.expectedEndTime);
    legGeometries.push(
      route.geometry && route.geometry.length >= 2 ? route.geometry : [coords[i], coords[i + 1]]
    );
    currentTime = route.expectedEndTime;
  }
  return { arrivals, legGeometries };
}
