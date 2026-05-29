import { describe, expect, it } from 'vitest';
import { haversineKm, insertStopsByShortestPath, type LngLat } from './shortestPath';

// Coordinates used throughout the tests are [lng, lat].
const OSLO: LngLat = [10.7522, 59.9139];
const BERGEN: LngLat = [5.3221, 60.3913];
const TRONDHEIM: LngLat = [10.3951, 63.4305];

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(OSLO, OSLO)).toBe(0);
  });

  it('is symmetric', () => {
    expect(haversineKm(OSLO, BERGEN)).toBeCloseTo(haversineKm(BERGEN, OSLO), 9);
  });

  it('matches the known great-circle distance between Oslo and Bergen (~308 km)', () => {
    // Reference value from standard great-circle calculators: ~308 km.
    expect(haversineKm(OSLO, BERGEN)).toBeGreaterThan(300);
    expect(haversineKm(OSLO, BERGEN)).toBeLessThan(316);
  });

  it('handles points across larger latitudes (Oslo→Trondheim ~392 km)', () => {
    expect(haversineKm(OSLO, TRONDHEIM)).toBeGreaterThan(385);
    expect(haversineKm(OSLO, TRONDHEIM)).toBeLessThan(400);
  });
});

describe('insertStopsByShortestPath', () => {
  const origin: LngLat = [0, 0];
  const destination: LngLat = [10, 0];
  const mid = (item: string, x: number) => ({ item, coord: [x, 0] as LngLat });

  it('inserts pickup and dropoff at the cheapest slots, keeping fixed stops in order', () => {
    const fixed = [mid('a', 2), mid('b', 5), mid('c', 8)];
    const pickup = mid('pickup', 3);
    const dropoff = mid('dropoff', 7);

    const result = insertStopsByShortestPath(origin, destination, fixed, pickup, dropoff);

    expect(result).toEqual(['a', 'pickup', 'b', 'dropoff', 'c']);
  });

  it('preserves the relative order of the fixed stops even when it is not geographic', () => {
    // c (x=8) deliberately before a (x=2) — must stay that way.
    const fixed = [mid('c', 8), mid('a', 2)];
    const result = insertStopsByShortestPath(
      origin,
      destination,
      fixed,
      mid('pickup', 5),
      mid('dropoff', 6)
    );

    expect(result.indexOf('c')).toBeLessThan(result.indexOf('a'));
  });

  it('always keeps pickup before dropoff, even when dropoff is nearer the origin', () => {
    const result = insertStopsByShortestPath(
      origin,
      destination,
      [],
      mid('pickup', 8),
      mid('dropoff', 2)
    );

    expect(result).toEqual(['pickup', 'dropoff']);
  });
});
