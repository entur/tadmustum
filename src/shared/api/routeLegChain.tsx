import type { Position } from 'geojson';
import dayjs from 'dayjs';
import type { StreetRouteResult } from './journeyPlannerStreetRoute.tsx';
import { haversineKm } from '../geo/haversineKm.tsx';

// Plans a single car leg between two points departing at `dateTime`. The
// journey-planner street route (api.getStreetRoute) has this signature.
export type RouteLeg = (
  from: Position,
  to: Position,
  dateTime: string
) => Promise<StreetRouteResult | null>;

// What a map should draw for a routed path: the leg linestrings when a route is
// known, 'failed' when there is no chain to draw at all (a stop without a
// resolvable coordinate), or null when there is nothing to draw yet (no stops
// placed, or a route still being computed — drawing the straight line first and
// snapping to the real route afterwards looks bad).
export type RouteLegGeometries = Position[][] | 'failed' | null;

export interface RoutedLegChain {
  // Arrival time at each stop, aligned by index with the input coords;
  // arrivals[0] is the departure time itself.
  arrivals: string[];
  // Street geometry per leg (coords[i] -> coords[i+1]). A leg the planner would
  // not route falls back to the straight segment between its stops, so the
  // chain can always be drawn end-to-end.
  legGeometries: Position[][];
  // How many legs were estimated rather than planned, and how many legs there
  // are in total. Everything estimated is a straight line on the map and a
  // guess in the timetable, so callers surface a warning when this is non-zero
  // — but they still get a complete, usable chain.
  estimatedLegs: number;
  totalLegs: number;
}

// Timing for a leg the journey planner would not route: the straight-line
// distance, padded for the fact that roads bend, at a middling driving speed.
// Crude on purpose — it is only ever used where the planner gave us nothing.
const DETOUR_FACTOR = 1.3;
const FALLBACK_SPEED_KMH = 50;

const estimatedLegSeconds = (from: Position, to: Position): number => {
  const straightKm = haversineKm(from[1], from[0], to[1], to[0]);
  const seconds = Math.round(((straightKm * DETOUR_FACTOR) / FALLBACK_SPEED_KMH) * 3600);
  // A stop with a nonsense coordinate would otherwise poison every time after
  // it; treat it as taking no time and let the map show the mess instead.
  return Number.isFinite(seconds) ? seconds : 0;
};

// Adding to a time that isn't one throws, so an unusable departure time leaves
// the chain's times where they are rather than taking the whole trip down.
const advance = (from: string, seconds: number): string => {
  const start = dayjs(from);
  return start.isValid() ? start.add(seconds, 'second').toISOString() : from;
};

const isSameCoordinate = (from: Position, to: Position): boolean =>
  from[0] === to[0] && from[1] === to[1];

/**
 * Routes each consecutive leg of a multi-stop sequence in turn, departing each
 * stop the moment the vehicle arrives (no dwell), and accumulates arrival times
 * and street geometries.
 *
 * Always returns a complete chain. A leg the journey planner will not route is
 * timed from its straight-line distance and drawn as a straight segment rather
 * than failing the trip, and `estimatedLegs` reports how many legs that
 * happened to. The planner declines more often than "the request went wrong":
 *
 *   - Two stops in the same spot (a passenger picked up where the driver
 *     starts) have no trip to make, and the planner answers with no trip
 *     patterns at all. Measured against it, so does any pair of stops that link
 *     to the same point on the street network — up to about 150 m apart where
 *     roads are sparse. Estimating those costs nothing: the straight-line time
 *     for stops that close rounds to a few seconds.
 *   - A stop the network cannot be entered from — a pedestrian square, a
 *     mountainside, a spot in a lake — answers the same way at any distance.
 *     Estimating that leg keeps the rest of the trip's times and route intact
 *     instead of losing them to one bad stop.
 *   - The planner can also be down, or slow, or answer with an HTTP error. Those
 *     throw rather than return nothing, and are estimated too, so a trip stays
 *     editable and bookable while the journey planner is having a bad day.
 */
export async function routeLegChain(
  coords: Position[],
  departureTime: string,
  routeLeg: RouteLeg
): Promise<RoutedLegChain> {
  const arrivals: string[] = [departureTime];
  const legGeometries: Position[][] = [];
  let estimatedLegs = 0;
  let currentTime = departureTime;

  for (let i = 0; i < coords.length - 1; i++) {
    const from = coords[i];
    const to = coords[i + 1];

    // Identical coordinates always come back with no trip patterns, so don't
    // spend a request finding that out.
    let route: StreetRouteResult | null = null;
    if (!isSameCoordinate(from, to)) {
      try {
        route = await routeLeg(from, to, currentTime);
      } catch {
        // The planner is unreachable or errored; fall through to the estimate.
        route = null;
      }
    }

    // A route without a usable arrival time is no better than no route: every
    // stop after it would inherit the nonsense.
    if (!route || !dayjs(route.expectedEndTime).isValid()) {
      estimatedLegs += 1;
      currentTime = advance(currentTime, estimatedLegSeconds(from, to));
      arrivals.push(currentTime);
      legGeometries.push([from, to]);
      continue;
    }

    currentTime = route.expectedEndTime;
    arrivals.push(currentTime);
    legGeometries.push(route.geometry && route.geometry.length >= 2 ? route.geometry : [from, to]);
  }

  return { arrivals, legGeometries, estimatedLegs, totalLegs: Math.max(0, coords.length - 1) };
}

/**
 * What a map should draw for a routed chain.
 *
 * A chain of nothing but estimates is not a route: the map's dashed
 * straight-line fallback is the established signal for "this is not the real
 * driving path", so it is used rather than passing off straight segments as a
 * planned route. A chain the planner did plan — even partly — is drawn as it
 * came back, with `estimatedLegs` telling the user which parts are guesses.
 */
export const chainGeometries = (chain: RoutedLegChain): RouteLegGeometries =>
  chain.totalLegs > 0 && chain.estimatedLegs === chain.totalLegs ? 'failed' : chain.legGeometries;
