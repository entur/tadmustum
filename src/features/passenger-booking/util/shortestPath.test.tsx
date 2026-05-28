import { describe, expect, it } from 'vitest';
import { haversineKm, shortestPathThrough, type LngLat } from './shortestPath';

// Coordinates used throughout the tests are [lng, lat].
const OSLO: LngLat = [10.7522, 59.9139];
const BERGEN: LngLat = [5.3221, 60.3913];
const TRONDHEIM: LngLat = [10.3951, 63.4305];
const STAVANGER: LngLat = [5.7331, 58.969];

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

describe('shortestPathThrough', () => {
  it('returns just [origin, destination] when there are no middle points', () => {
    expect(shortestPathThrough(OSLO, BERGEN, [])).toEqual([OSLO, BERGEN]);
  });

  it('keeps the lone middle point between origin and destination', () => {
    const pickup: LngLat = [10.5, 60.0];
    expect(shortestPathThrough(OSLO, BERGEN, [pickup])).toEqual([OSLO, pickup, BERGEN]);
  });

  it('orders two middle points so the closer one to origin comes first', () => {
    // nearOrigin sits a hair north of Oslo; nearDestination sits a hair east of Bergen.
    const nearOrigin: LngLat = [10.7522, 60.0];
    const nearDestination: LngLat = [5.5, 60.3913];

    // Pass them in the deliberately bad order to force the function to reorder.
    const path = shortestPathThrough(OSLO, BERGEN, [nearDestination, nearOrigin]);

    expect(path).toEqual([OSLO, nearOrigin, nearDestination, BERGEN]);
  });

  it('does not move origin or destination, regardless of which middle points are closer', () => {
    // Throw a point that sits much closer to BERGEN than to OSLO into the middle —
    // origin and destination must still be the bookends.
    const closeToBergen: LngLat = [5.4, 60.39];
    const closeToOslo: LngLat = [10.76, 59.92];
    const path = shortestPathThrough(OSLO, BERGEN, [closeToBergen, closeToOslo]);

    expect(path[0]).toEqual(OSLO);
    expect(path[path.length - 1]).toEqual(BERGEN);
    expect(path).toHaveLength(4);
  });

  it('finds the optimal ordering for several middle points', () => {
    // Origin = Oslo, destination = Bergen. Middle = Trondheim (far north) and
    // Stavanger (far southwest). Any path passing through both must hit one
    // before the other; the optimum depends on geometry — we just assert that
    // the returned ordering achieves the minimum cost across all permutations.
    const middle: LngLat[] = [TRONDHEIM, STAVANGER];
    const result = shortestPathThrough(OSLO, BERGEN, middle);

    // Compute the cost of every permutation and confirm the result matches the minimum.
    const candidates: LngLat[][] = [
      [OSLO, TRONDHEIM, STAVANGER, BERGEN],
      [OSLO, STAVANGER, TRONDHEIM, BERGEN],
    ];
    const cost = (path: LngLat[]) =>
      path.slice(1).reduce((acc, p, i) => acc + haversineKm(path[i], p), 0);
    const minCost = Math.min(...candidates.map(cost));

    expect(cost(result)).toBeCloseTo(minCost, 9);
  });

  it('reorders three middle points to minimise total distance', () => {
    // A small "stops along a corridor" scenario: passing them in scrambled order
    // should produce the natural left-to-right ordering.
    const origin: LngLat = [0, 0];
    const destination: LngLat = [10, 0];
    const a: LngLat = [2, 0];
    const b: LngLat = [5, 0];
    const c: LngLat = [8, 0];

    const result = shortestPathThrough(origin, destination, [c, a, b]);
    expect(result).toEqual([origin, a, b, c, destination]);
  });

  it('does not mutate the caller-provided middle array', () => {
    const middle: LngLat[] = [TRONDHEIM, STAVANGER];
    const snapshot: LngLat[] = middle.map(p => [...p] as LngLat);

    shortestPathThrough(OSLO, BERGEN, middle);

    expect(middle).toEqual(snapshot);
  });
});
