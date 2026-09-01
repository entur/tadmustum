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

    expect(chain.arrivals).toEqual([
      '2026-06-01T08:00:00.000Z',
      '2026-06-01T08:10:00.000Z',
      '2026-06-01T08:20:00.000Z',
    ]);
    expect(chain.legGeometries).toEqual([
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

    expect(chain.legGeometries).toEqual([[A, B]]);
  });

  it('takes no time and asks for no route when two stops share a location', async () => {
    // The journey planner returns no trip patterns for a route between
    // identical points, which used to fail the whole chain — so a passenger
    // picked up exactly where the driver starts broke the trip's routing.
    const routeLeg = vi.fn<RouteLeg>().mockImplementation(tenMinPerLeg);

    const chain = await routeLegChain([A, A, B], '2026-06-01T08:00:00.000Z', routeLeg);

    expect(chain.arrivals).toEqual([
      '2026-06-01T08:00:00.000Z',
      // No driving between the first two stops: the vehicle is already there.
      '2026-06-01T08:00:00.000Z',
      '2026-06-01T08:10:00.000Z',
    ]);
    expect(chain.legGeometries).toEqual([
      [A, A],
      [A, [10.25, 59.25], B],
    ]);
    expect(routeLeg).toHaveBeenCalledTimes(1);
    expect(routeLeg).toHaveBeenCalledWith(A, B, '2026-06-01T08:00:00.000Z');
  });

  it('routes a trip whose stops are all at the same location', async () => {
    const routeLeg = vi.fn<RouteLeg>().mockImplementation(tenMinPerLeg);

    const chain = await routeLegChain([A, A, A], '2026-06-01T08:00:00.000Z', routeLeg);

    expect(chain.arrivals).toEqual([
      '2026-06-01T08:00:00.000Z',
      '2026-06-01T08:00:00.000Z',
      '2026-06-01T08:00:00.000Z',
    ]);
    expect(routeLeg).not.toHaveBeenCalled();
  });

  it('costs no time when the planner will not plan a leg between stops metres apart', async () => {
    // A booking URL carries coordinates rounded to six decimals, so the same
    // place is not always the same number — the planner is asked, says there is
    // no trip to make, and the leg is estimated at its (negligible) distance.
    const almostA: Position = [A[0] + 0.00005, A[1]];
    const routeLeg = vi.fn<RouteLeg>().mockResolvedValue(null);

    const chain = await routeLegChain([A, almostA], '2026-06-01T08:00:00.000Z', routeLeg);

    expect(chain.arrivals).toEqual(['2026-06-01T08:00:00.000Z', '2026-06-01T08:00:00.000Z']);
    expect(chain.estimatedLegs).toBe(1);
    expect(routeLeg).toHaveBeenCalledTimes(1);
  });

  it('still routes stops far enough apart to drive between', async () => {
    // ~55 m north of A: a real, if short, leg.
    const nearbyA: Position = [A[0], A[1] + 0.0005];
    const routeLeg = vi.fn<RouteLeg>().mockImplementation(tenMinPerLeg);

    const chain = await routeLegChain([A, nearbyA], '2026-06-01T08:00:00.000Z', routeLeg);

    expect(chain.arrivals).toEqual(['2026-06-01T08:00:00.000Z', '2026-06-01T08:10:00.000Z']);
    expect(routeLeg).toHaveBeenCalledTimes(1);
  });

  it('estimates a leg the planner will not plan rather than failing the chain', async () => {
    const failsSecondLeg = vi
      .fn<RouteLeg>()
      .mockImplementationOnce(tenMinPerLeg)
      .mockResolvedValueOnce(null);

    const chain = await routeLegChain([A, B, C], '2026-06-01T08:00:00.000Z', failsSecondLeg);

    // B -> C is about 60 km in a straight line, so the estimate lands roughly
    // an hour and a quarter after the routed first leg. The trip keeps a
    // complete, ordered timetable either way.
    expect(chain.arrivals[0]).toBe('2026-06-01T08:00:00.000Z');
    expect(chain.arrivals[1]).toBe('2026-06-01T08:10:00.000Z');
    expect(dayjs(chain.arrivals[2]).isAfter(dayjs(chain.arrivals[1]))).toBe(true);
    // The unplanned leg is drawn as the straight segment between its stops.
    expect(chain.legGeometries[1]).toEqual([B, C]);
    expect(chain.estimatedLegs).toBe(1);
    expect(chain.totalLegs).toBe(2);
    expect(failsSecondLeg).toHaveBeenCalledTimes(2);
  });

  it('estimates every leg when the planner is unreachable', async () => {
    // getStreetRoute throws on an HTTP error or a dead connection; a trip stays
    // editable and bookable while the journey planner is having a bad day.
    const throwingRouter = vi.fn<RouteLeg>().mockRejectedValue(new Error('503'));

    const chain = await routeLegChain([A, B, C], '2026-06-01T08:00:00.000Z', throwingRouter);

    expect(chain.arrivals).toHaveLength(3);
    expect(chain.legGeometries).toEqual([
      [A, B],
      [B, C],
    ]);
    expect(chain.estimatedLegs).toBe(2);
    expect(chain.totalLegs).toBe(2);
  });

  it('survives a planner that answers with an unusable arrival time', async () => {
    const nonsense = vi.fn<RouteLeg>().mockResolvedValue({
      expectedStartTime: '2026-06-01T08:00:00.000Z',
      expectedEndTime: 'not a time',
      duration: 600,
      distance: 1000,
    });

    const chain = await routeLegChain([A, B], '2026-06-01T08:00:00.000Z', nonsense);

    // Estimated instead, rather than letting the bad value poison every stop
    // after it.
    expect(chain.estimatedLegs).toBe(1);
    expect(dayjs(chain.arrivals[1]).isValid()).toBe(true);
  });

  it('never throws on coordinates or a departure time that make no sense', async () => {
    const routeLeg = vi.fn<RouteLeg>().mockResolvedValue(null);

    const broken = await routeLegChain(
      [A, [Number.NaN, Number.NaN]],
      '2026-06-01T08:00:00.000Z',
      routeLeg
    );
    expect(broken.arrivals).toHaveLength(2);
    expect(dayjs(broken.arrivals[1]).isValid()).toBe(true);

    const noDeparture = await routeLegChain([A, B], 'not a time', routeLeg);
    expect(noDeparture.arrivals).toHaveLength(2);

    const nothing = await routeLegChain([], '2026-06-01T08:00:00.000Z', routeLeg);
    expect(nothing).toEqual({
      arrivals: ['2026-06-01T08:00:00.000Z'],
      legGeometries: [],
      estimatedLegs: 0,
      totalLegs: 0,
    });
  });

  it('reports a fully planned chain as having nothing estimated', async () => {
    const chain = await routeLegChain([A, B, C], '2026-06-01T08:00:00.000Z', tenMinPerLeg);

    expect(chain.estimatedLegs).toBe(0);
    expect(chain.totalLegs).toBe(2);
  });
});
