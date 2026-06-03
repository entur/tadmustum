import type { Position } from 'geojson';
import decodePolyline from '../util/decodePolyline.tsx';

export interface StreetRouteResult {
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
  distance: number;
  // The decoded street geometry of the route ([lng, lat] positions), for
  // drawing the actual driving path on a map. Null/absent when OTP returned no
  // leg geometry (e.g. flexible legs, which have no pointsOnLink). Optional so
  // routing stubs that only care about times don't have to provide it.
  geometry?: Position[] | null;
}

interface TripPattern {
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
  distance: number;
  legs?: { pointsOnLink?: { points?: string | null } | null }[] | null;
}

// A direct car route between two points, asking for the leg geometry
// (encoded polyline) on top of the times.
const STREET_ROUTE_QUERY = `
  query StreetRoute($from: Location!, $to: Location!, $dateTime: DateTime, $modes: Modes) {
    trip(from: $from, to: $to, dateTime: $dateTime, modes: $modes, numTripPatterns: 1) {
      tripPatterns {
        expectedStartTime
        expectedEndTime
        duration
        distance
        legs {
          pointsOnLink {
            points
          }
        }
      }
    }
  }
`;

// Plans a single car street route between two points via the journey planner
// GraphQL API. Plain fetch — a GraphQL request is just a POST of
// { query, variables }, and a client library buys nothing for one query.
const getStreetRoute =
  (uri: string) =>
  async (from: Position, to: Position, dateTime: string): Promise<StreetRouteResult | null> => {
    const response = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ET-Client-Name': 'entur - tadmustum',
      },
      body: JSON.stringify({
        query: STREET_ROUTE_QUERY,
        variables: {
          from: { coordinates: { latitude: from[1], longitude: from[0] } },
          to: { coordinates: { latitude: to[1], longitude: to[0] } },
          dateTime,
          modes: { directMode: 'car', transportModes: [] },
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Street route request failed: ${response.status}`);
    }

    const body = (await response.json()) as {
      data?: { trip?: { tripPatterns?: TripPattern[] } };
    };
    const patterns = body.data?.trip?.tripPatterns;
    if (!patterns || patterns.length === 0) return null;

    const pattern = patterns[0];
    // A direct car route is a single leg, but concatenate defensively in case
    // OTP ever splits it. Legs without geometry are simply skipped.
    const geometry = (pattern.legs ?? [])
      .map(leg => leg?.pointsOnLink?.points)
      .filter((points): points is string => !!points)
      .flatMap(decodePolyline);

    return {
      expectedStartTime: pattern.expectedStartTime,
      expectedEndTime: pattern.expectedEndTime,
      duration: pattern.duration,
      distance: pattern.distance,
      geometry: geometry.length >= 2 ? geometry : null,
    };
  };

export default getStreetRoute;
