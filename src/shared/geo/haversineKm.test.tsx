import { describe, expect, it } from 'vitest';
import { haversineKm } from './haversineKm';

const OSLO = [59.9139, 10.7522] as const;
const BERGEN = [60.3913, 5.3221] as const;

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(...OSLO, ...OSLO)).toBe(0);
  });

  it('measures the great-circle distance between two points', () => {
    // Oslo to Bergen is about 305 km as the crow flies.
    expect(haversineKm(...OSLO, ...BERGEN)).toBeCloseTo(305, 0);
  });

  it('is symmetric', () => {
    expect(haversineKm(...OSLO, ...BERGEN)).toBeCloseTo(haversineKm(...BERGEN, ...OSLO), 9);
  });
});
