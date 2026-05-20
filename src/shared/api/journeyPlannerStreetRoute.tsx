import { ApolloClient, gql, HttpLink, InMemoryCache } from '@apollo/client';
import type { Position } from 'geojson';

export interface StreetRouteResult {
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
  distance: number;
  fromName: string | null;
  toName: string | null;
}

interface LegPlace {
  name?: string | null;
}

interface Leg {
  fromPlace?: LegPlace | null;
  toPlace?: LegPlace | null;
}

interface TripPattern {
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
  distance: number;
  legs?: Leg[] | null;
}

const getStreetRoute =
  (uri: string) =>
  async (from: Position, to: Position, dateTime: string): Promise<StreetRouteResult | null> => {
    const client = new ApolloClient({
      link: new HttpLink({
        uri,
        headers: { 'ET-Client-Name': 'entur - deviation-messages' },
      }),
      cache: new InMemoryCache(),
    });

    const query = gql`
      query StreetRoute($from: Location!, $to: Location!, $dateTime: DateTime, $modes: Modes) {
        trip(from: $from, to: $to, dateTime: $dateTime, modes: $modes, numTripPatterns: 1) {
          tripPatterns {
            expectedStartTime
            expectedEndTime
            duration
            distance
            legs {
              fromPlace {
                name
              }
              toPlace {
                name
              }
            }
          }
        }
      }
    `;

    const variables = {
      from: { coordinates: { latitude: from[1], longitude: from[0] } },
      to: { coordinates: { latitude: to[1], longitude: to[0] } },
      dateTime,
      modes: { directMode: 'car', transportModes: [] },
    };

    const result = await client.query({ query, variables });
    const patterns: TripPattern[] | undefined = result.data?.trip?.tripPatterns;
    if (!patterns || patterns.length === 0) return null;

    const pattern = patterns[0];
    const legs = pattern.legs ?? [];
    const fromName = legs[0]?.fromPlace?.name ?? null;
    const toName = legs[legs.length - 1]?.toPlace?.name ?? null;

    return {
      expectedStartTime: pattern.expectedStartTime,
      expectedEndTime: pattern.expectedEndTime,
      duration: pattern.duration,
      distance: pattern.distance,
      fromName,
      toName,
    };
  };

export default getStreetRoute;
