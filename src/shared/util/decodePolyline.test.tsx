import { describe, expect, it } from 'vitest';
import decodePolyline from './decodePolyline';

describe('decodePolyline', () => {
  it('decodes the reference example from the polyline algorithm spec', () => {
    // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    // encodes (38.5,-120.2), (40.7,-120.95), (43.252,-126.453).
    const positions = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    expect(positions).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});
