import type { Position } from 'geojson';

// Decodes a Google encoded polyline into GeoJSON positions ([lng, lat]).
// OTP's PointsOnLink.points uses this format at the standard 1e5 precision
// (see OpenTripPlanner's PolylineEncoder), so no precision parameter is needed.
export default function decodePolyline(encoded: string): Position[] {
  const positions: Position[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const readDelta = (): number => {
    let byte;
    let shift = 0;
    let result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += readDelta();
    lng += readDelta();
    positions.push([lng / 1e5, lat / 1e5]);
  }

  return positions;
}
