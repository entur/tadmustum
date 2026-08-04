import { describe, expect, it } from 'vitest';
import type { EstimatedCall } from '../../../shared/model/EstimatedCall';
import { slackMinutes, slackViolations, tourDwellMinutes } from './deviationBudget';

const call = (overrides: Partial<EstimatedCall> = {}): EstimatedCall =>
  ({
    order: 1,
    stopPointRef: 'MAL:Stop:1',
    stopPointName: 'Booked stop',
    aimedArrivalTime: '2026-08-10T09:00:00.000Z',
    expectedArrivalTime: '2026-08-10T09:00:00.000Z',
    latestExpectedArrivalTime: '2026-08-10T09:15:00.000Z',
    ...overrides,
  }) as EstimatedCall;

describe('tourDwellMinutes', () => {
  it('recovers the dwell the tour was built with from its first call', () => {
    const calls = [
      call({
        aimedArrivalTime: '2026-08-10T09:00:00.000Z',
        aimedDepartureTime: '2026-08-10T09:02:00.000Z',
      }),
    ];

    expect(tourDwellMinutes(calls)).toBe(2);
  });

  it('is zero for a carpool origin, which only departs', () => {
    const calls = [
      call({ aimedArrivalTime: undefined, aimedDepartureTime: '2026-08-10T09:00:00.000Z' }),
    ];

    expect(tourDwellMinutes(calls)).toBe(0);
  });

  it('is zero rather than negative when the times are inconsistent', () => {
    const calls = [
      call({
        aimedArrivalTime: '2026-08-10T09:05:00.000Z',
        aimedDepartureTime: '2026-08-10T09:00:00.000Z',
      }),
    ];

    expect(tourDwellMinutes(calls)).toBe(0);
  });

  it('is zero for an empty tour', () => {
    expect(tourDwellMinutes([])).toBe(0);
  });
});

describe('slackMinutes', () => {
  it('is the gap between the arrival and its deadline', () => {
    expect(slackMinutes(call())).toBe(15);
  });

  it('is null when the stop carries no deadline', () => {
    expect(slackMinutes(call({ latestExpectedArrivalTime: undefined }))).toBeNull();
  });

  it('goes negative once the stop is past its deadline', () => {
    expect(slackMinutes(call({ expectedArrivalTime: '2026-08-10T09:20:00.000Z' }))).toBe(-5);
  });
});

describe('slackViolations', () => {
  const original = [
    call({ stopPointRef: 'a', expectedArrivalTime: '2026-08-10T09:00:00.000Z' }),
    call({ stopPointRef: 'b', expectedArrivalTime: '2026-08-10T09:10:00.000Z' }),
  ];

  it('reports nothing while every stop stays inside its budget', () => {
    const preview = [
      call({ stopPointRef: 'a', expectedArrivalTime: '2026-08-10T09:05:00.000Z' }),
      call({ stopPointRef: 'b', expectedArrivalTime: '2026-08-10T09:12:00.000Z' }),
    ];

    expect(slackViolations(preview, original)).toEqual([]);
  });

  it('reports the stop the insertion pushes past its deadline, and by how much', () => {
    const preview = [
      call({ stopPointRef: 'a', expectedArrivalTime: '2026-08-10T09:00:00.000Z' }),
      call({
        stopPointRef: 'b',
        stopPointName: 'Second stop',
        expectedArrivalTime: '2026-08-10T09:23:00.000Z',
      }),
    ];

    expect(slackViolations(preview, original)).toEqual([
      { index: 1, stopName: 'Second stop', overrunMinutes: 8 },
    ]);
  });

  it('does not blame the booking for a stop the tour was already late for', () => {
    const alreadyLate = [
      call({ stopPointRef: 'a', expectedArrivalTime: '2026-08-10T09:00:00.000Z' }),
      // Already 5 min past its own deadline before any booking.
      call({ stopPointRef: 'b', expectedArrivalTime: '2026-08-10T09:20:00.000Z' }),
    ];
    const preview = [
      call({ stopPointRef: 'a', expectedArrivalTime: '2026-08-10T09:00:00.000Z' }),
      call({ stopPointRef: 'b', expectedArrivalTime: '2026-08-10T09:25:00.000Z' }),
    ];

    expect(slackViolations(preview, alreadyLate)).toEqual([]);
  });

  it('reports an inserted stop of its own, which has no original to compare against', () => {
    const preview = [
      call({ stopPointRef: 'a', expectedArrivalTime: '2026-08-10T09:00:00.000Z' }),
      call({
        stopPointRef: 'MAL:PickupPoint:new',
        stopPointName: 'Passenger Pickup',
        expectedArrivalTime: '2026-08-10T09:30:00.000Z',
      }),
    ];

    expect(slackViolations(preview, original)).toEqual([
      { index: 1, stopName: 'Passenger Pickup', overrunMinutes: 15 },
    ]);
  });

  it('ignores stops with no deadline to overrun', () => {
    const preview = [
      call({ stopPointRef: 'a', latestExpectedArrivalTime: undefined }),
      call({ stopPointRef: 'b', latestExpectedArrivalTime: undefined }),
    ];

    expect(slackViolations(preview, original)).toEqual([]);
  });
});
