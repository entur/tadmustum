import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { routeLegChain, type RouteLeg } from './routeLegChain';
import type { Position } from 'geojson';

const A: Position = [10.0, 59.0];
const B: Position = [10.5, 59.5];
const C: Position = [11.0, 60.0];

// Each leg takes 10 minutes and routes via a midpoint, so the geometry is
// distinguishable from the straight segment between the stops.
const tenMinPerLeg: RouteLeg = async (from, to, dateTime) => ({
  expectedStartTime: dateTime,
  expectedEndTime: dayjs(dateTime).add(10, 'minute').toISOString(),
  duration: 600,
  distance: 1000,
  geometry: [from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], to],
});

describe('routeLegChain', () => {
  it('chains arrival times leg by leg from the departure', async () => {
    const chain = await routeLegChain([A, B, C], '2026-06-01T08:00:00.000Z', tenMinPerLeg);

    expect(chain?.arrivals).toEqual([
      '2026-06-01T08:00:00.000Z',
      '2026-06-01T08:10:00.000Z',
      '2026-06-01T08:20:00.000Z',
    ]);
    expect(chain?.legGeometries).toEqual([
      [A, [10.25, 59.25], B],
      [B, [10.75, 59.75], C],
    ]);
  });

  it('falls back to the straight segment for a leg without geometry', async () => {
    const noGeometry: RouteLeg = async (_from, _to, dateTime) => ({
      expectedStartTime: dateTime,
      expectedEndTime: dayjs(dateTime).add(10, 'minute').toISOString(),
      duration: 600,
      distance: 1000,
    });

    const chain = await routeLegChain([A, B], '2026-06-01T08:00:00.000Z', noGeometry);

    expect(chain?.legGeometries).toEqual([[A, B]]);
  });

  it('returns null when any leg cannot be planned', async () => {
    const failsSecondLeg = vi
      .fn<RouteLeg>()
      .mockImplementationOnce(tenMinPerLeg)
      .mockResolvedValueOnce(null);

    const chain = await routeLegChain([A, B, C], '2026-06-01T08:00:00.000Z', failsSecondLeg);

    expect(chain).toBeNull();
    expect(failsSecondLeg).toHaveBeenCalledTimes(2);
  });
});
