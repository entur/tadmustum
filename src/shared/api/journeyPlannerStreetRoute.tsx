import { ApolloClient, gql, HttpLink, InMemoryCache } from '@apollo/client';
import type { Position } from 'geojson';

export interface StreetRouteResult {
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
  distance: number;
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
    const patterns = result.data?.trip?.tripPatterns;
    return patterns && patterns.length > 0 ? patterns[0] : null;
  };

export default getStreetRoute;
