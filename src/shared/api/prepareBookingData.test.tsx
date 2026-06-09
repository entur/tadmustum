import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import {
  prepareBookingData,
  previewBookingRoute,
  routedBookingPreview,
  type PassengerBookingData,
  type RouteLeg,
} from './prepareBookingData';
import type { Extrajourney } from '../model/Extrajourney';

vi.mock('uuid', () => {
  let counter = 0;
  return {
    v4: () => `uuid-${++counter}`,
  };
});

const baseTrip = (overrides: Partial<Extrajourney> = {}): Extrajourney =>
  ({
    id: 'ENT:ServiceJourney:1',
    estimatedVehicleJourney: {
      recordedAtTime: '2026-05-20T09:00:00.000Z',
      lineRef: 'ENT:CarPooling:trip-1',
      estimatedVehicleJourneyCode: 'ENT:ServiceJourney:1',
      publishedLineName: 'Carpooling trip',
      estimatedCalls: {
        estimatedCall: [
          {
            order: 1,
            stopPointName: 'Oslo S',
            destinationDisplay: 'Bergen',
            aimedDepartureTime: '2026-06-01T09:00:00.000Z',
            expectedDepartureTime: '2026-06-01T09:00:00.000Z',
            expectedDepartureOccupancy: [{ onboardCount: 1 }],
            expectedDepartureCapacities: [{ totalCapacity: 4 }],
          },
          {
            order: 2,
            stopPointName: 'Bergen stasjon',
            destinationDisplay: 'Bergen',
            aimedArrivalTime: '2026-06-01T15:00:00.000Z',
            expectedArrivalTime: '2026-06-01T15:00:00.000Z',
            expectedDepartureOccupancy: [{ onboardCount: 1 }],
          },
        ],
      },
      ...overrides.estimatedVehicleJourney,
    },
    ...overrides,
  }) as Extrajourney;

const baseBooking = (overrides: Partial<PassengerBookingData> = {}): PassengerBookingData => ({
  tripId: 'ENT:ServiceJourney:1',
  pickupCoordinates: [10.7522, 59.9139],
  dropoffCoordinates: [5.3221, 60.3913],
  numberOfPassengers: 2,
  passengerDeviationBudget: 10,
  ...overrides,
});

describe('prepareBookingData', () => {
  it('throws when the original trip has no estimatedVehicleJourneyCode', async () => {
    const trip = baseTrip();
    delete (trip.estimatedVehicleJourney as { estimatedVehicleJourneyCode?: string })
      .estimatedVehicleJourneyCode;

    await expect(prepareBookingData(trip, baseBooking(), 'ENT:Authority:ENT')).rejects.toThrow(
      /estimatedVehicleJourneyCode/
    );
  });

  it('throws when the original trip has fewer than 2 stops', async () => {
    const trip = baseTrip();
    trip.estimatedVehicleJourney.estimatedCalls.estimatedCall =
      trip.estimatedVehicleJourney.estimatedCalls.estimatedCall.slice(0, 1);

    await expect(prepareBookingData(trip, baseBooking(), 'ENT:Authority:ENT')).rejects.toThrow(
      /at least 2 stops/
    );
  });

  it('does not echo back the server id and preserves the estimatedVehicleJourneyCode', async () => {
    const result = await prepareBookingData(baseTrip(), baseBooking(), 'ENT:Authority:ENT');

    expect(result.input).not.toHaveProperty('id');
    expect(result.input.estimatedVehicleJourney.estimatedVehicleJourneyCode).toBe(
      'ENT:ServiceJourney:1'
    );
  });

  it('inserts pickup and dropoff between the original first and last stops and reorders them', async () => {
    const result = await prepareBookingData(baseTrip(), baseBooking(), 'ENT:Authority:ENT');

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls).toHaveLength(4);
    expect(calls[0].order).toBe(1);
    expect(calls[0].stopPointName).toBe('Oslo S');
    expect(calls[1].order).toBe(2);
    expect(calls[1].stopPointName).toMatch(/^Passenger Pickup/);
    expect(calls[2].order).toBe(3);
    expect(calls[2].stopPointName).toMatch(/^Passenger Dropoff/);
    expect(calls[3].order).toBe(4);
    expect(calls[3].stopPointName).toBe('Bergen stasjon');
  });

  it('formats pickup and dropoff stop names with lat,lng to 4 decimals', async () => {
    const result = await prepareBookingData(baseTrip(), baseBooking(), 'ENT:Authority:ENT');

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].stopPointName).toBe('Passenger Pickup (59.9139, 10.7522)');
    expect(calls[2].stopPointName).toBe('Passenger Dropoff (60.3913, 5.3221)');
  });

  it('places pickup at 1/3 and dropoff at 2/3 of the journey when no router is provided', async () => {
    // Journey is 09:00 -> 15:00 = 6h. 1/3 = 11:00, 2/3 = 13:00.
    const result = await prepareBookingData(baseTrip(), baseBooking(), 'ENT:Authority:ENT');

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].aimedDepartureTime).toBe('2026-06-01T11:00:00.000Z');
    expect(calls[1].expectedDepartureTime).toBe('2026-06-01T11:00:00.000Z');
    expect(calls[2].aimedArrivalTime).toBe('2026-06-01T13:00:00.000Z');
    expect(calls[2].expectedArrivalTime).toBe('2026-06-01T13:00:00.000Z');
  });

  it('respects explicit pickupTime and dropoffTime when provided', async () => {
    const result = await prepareBookingData(
      baseTrip(),
      baseBooking({
        pickupTime: '2026-06-01T10:15:00.000Z',
        dropoffTime: '2026-06-01T14:45:00.000Z',
      }),
      'ENT:Authority:ENT'
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].aimedDepartureTime).toBe('2026-06-01T10:15:00.000Z');
    expect(calls[2].aimedArrivalTime).toBe('2026-06-01T14:45:00.000Z');
  });

  it('adds passengerDeviationBudget to derive latestExpectedArrivalTime', async () => {
    const result = await prepareBookingData(
      baseTrip(),
      baseBooking({ passengerDeviationBudget: 15 }),
      'ENT:Authority:ENT'
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].latestExpectedArrivalTime).toBe('2026-06-01T11:15:00.000Z');
    expect(calls[2].latestExpectedArrivalTime).toBe('2026-06-01T13:15:00.000Z');
  });

  it('omits latestExpectedArrivalTime when passengerDeviationBudget is not provided', async () => {
    const result = await prepareBookingData(
      baseTrip(),
      baseBooking({ passengerDeviationBudget: undefined }),
      'ENT:Authority:ENT'
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].latestExpectedArrivalTime).toBeUndefined();
    expect(calls[2].latestExpectedArrivalTime).toBeUndefined();
  });

  it('increments the onboard count by the number of passengers at pickup', async () => {
    const result = await prepareBookingData(
      baseTrip(),
      baseBooking({ numberOfPassengers: 3 }),
      'ENT:Authority:ENT'
    );

    const pickup = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall[1];
    expect(pickup.expectedDepartureOccupancy?.[0].onboardCount).toBe(4); // 1 (existing) + 3
  });

  it('inherits totalCapacity from the original first stop', async () => {
    const result = await prepareBookingData(baseTrip(), baseBooking(), 'ENT:Authority:ENT');

    const pickup = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall[1];
    const dropoff = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall[2];
    expect(pickup.expectedDepartureCapacities).toEqual([{ totalCapacity: 4 }]);
    expect(dropoff.expectedDepartureCapacities).toEqual([{ totalCapacity: 4 }]);
  });

  it('inherits destinationDisplay from the original last stop', async () => {
    const result = await prepareBookingData(baseTrip(), baseBooking(), 'ENT:Authority:ENT');

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].destinationDisplay).toBe('Bergen');
    expect(calls[2].destinationDisplay).toBe('Bergen');
  });

  // Point-stop circular area (sentinel radius 1) so calls have a resolvable
  // coordinate; lat is constant so haversine ordering is by longitude.
  const stop = (name: string, lng: number, order: number, extra = {}) => ({
    order,
    stopPointName: name,
    destinationDisplay: 'Bergen',
    departureStopAssignment: {
      expectedFlexibleArea: { circularArea: { longitude: lng, latitude: 60, radius: 1 } },
    },
    ...extra,
  });

  // origin(10.0) -> A(10.2) -> B(10.6) -> destination(11.0), all on lat 60.
  const tripWithIntermediates = (): Extrajourney =>
    ({
      id: 'ENT:ServiceJourney:1',
      estimatedVehicleJourney: {
        recordedAtTime: '2026-05-20T09:00:00.000Z',
        lineRef: 'ENT:CarPooling:trip-1',
        publishedLineName: 'Carpooling trip',
        estimatedVehicleJourneyCode: 'ENT:ServiceJourney:1',
        estimatedCalls: {
          estimatedCall: [
            stop('Origin', 10.0, 1, {
              aimedDepartureTime: '2026-06-01T09:00:00.000Z',
              expectedDepartureTime: '2026-06-01T09:00:00.000Z',
              expectedDepartureOccupancy: [{ onboardCount: 1 }],
              expectedDepartureCapacities: [{ totalCapacity: 4 }],
            }),
            stop('Inter A', 10.2, 2),
            stop('Inter B', 10.6, 3),
            stop('Destination', 11.0, 4, {
              aimedArrivalTime: '2026-06-01T15:00:00.000Z',
              expectedArrivalTime: '2026-06-01T15:00:00.000Z',
            }),
          ],
        },
      },
    }) as Extrajourney;

  it("keeps the driver's intermediate stops and interleaves pickup/dropoff by shortest path", async () => {
    // pickup at 10.3 (between A and B), dropoff at 10.7 (between B and destination).
    const result = await prepareBookingData(
      tripWithIntermediates(),
      baseBooking({ pickupCoordinates: [10.3, 60], dropoffCoordinates: [10.7, 60] }),
      'ENT:Authority:ENT'
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    // Nothing dropped: 4 original + pickup + dropoff = 6.
    expect(calls).toHaveLength(6);
    expect(calls.map(c => c.stopPointName.replace(/ \(.*/, ''))).toEqual([
      'Origin',
      'Inter A',
      'Passenger Pickup',
      'Inter B',
      'Passenger Dropoff',
      'Destination',
    ]);
    // order renumbered sequentially.
    expect(calls.map(c => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('preserves a previously booked passenger when a second passenger books', async () => {
    const firstBooking = await prepareBookingData(
      tripWithIntermediates(),
      baseBooking({
        pickupCoordinates: [10.3, 60],
        dropoffCoordinates: [10.7, 60],
        numberOfPassengers: 1,
      }),
      'ENT:Authority:ENT'
    );

    // Feed the updated trip back in, as the real flow does, and book again.
    const secondBooking = await prepareBookingData(
      firstBooking.input,
      baseBooking({
        pickupCoordinates: [10.1, 60],
        dropoffCoordinates: [10.9, 60],
        numberOfPassengers: 1,
      }),
      'ENT:Authority:ENT'
    );

    const calls = secondBooking.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    // 6 calls from the first booking + the second passenger's pickup/dropoff.
    expect(calls).toHaveLength(8);
    const names = calls.map(c => c.stopPointName);
    // First passenger's stops survive the second booking.
    expect(names.filter(n => n.startsWith('Passenger Pickup'))).toHaveLength(2);
    expect(names.filter(n => n.startsWith('Passenger Dropoff'))).toHaveLength(2);
    expect(names.filter(n => n.startsWith('Inter'))).toHaveLength(2);
    expect(calls.map(c => c.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('recomputes the onboard count at every stop along the route', async () => {
    const result = await prepareBookingData(
      tripWithIntermediates(),
      baseBooking({
        pickupCoordinates: [10.3, 60],
        dropoffCoordinates: [10.7, 60],
        numberOfPassengers: 2,
      }),
      'ENT:Authority:ENT'
    );

    // Order: Origin, Inter A, Pickup, Inter B, Dropoff, Destination.
    // Driver (1) on board, +2 at pickup, -2 at dropoff.
    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls.map(c => c.expectedDepartureOccupancy?.[0]?.onboardCount)).toEqual([
      1, 1, 3, 3, 1, 1,
    ]);
  });

  it('still books when over capacity, with occupancy reflecting the overload', async () => {
    // Driver (1) + 4 passengers = 5 on board, capacity is 4. Over-capacity
    // bookings are allowed (the UI warns); the call must not reject.
    const result = await prepareBookingData(
      tripWithIntermediates(),
      baseBooking({
        pickupCoordinates: [10.3, 60],
        dropoffCoordinates: [10.7, 60],
        numberOfPassengers: 4,
      }),
      'ENT:Authority:ENT'
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    const maxOnboard = Math.max(
      ...calls.map(c => c.expectedDepartureOccupancy?.[0]?.onboardCount ?? 0)
    );
    expect(maxOnboard).toBe(5); // exceeds the capacity of 4
  });

  it('computes real stop times from the router and shifts latestExpectedArrivalTime', async () => {
    // Each leg takes 10 minutes; origin departs 09:00.
    const tenMinPerLeg: RouteLeg = async (_from, _to, dateTime) => ({
      expectedStartTime: dateTime,
      expectedEndTime: dayjs(dateTime).add(10, 'minute').toISOString(),
      duration: 600,
      distance: 1000,
    });

    const result = await prepareBookingData(
      tripWithIntermediates(),
      baseBooking({
        pickupCoordinates: [10.3, 60],
        dropoffCoordinates: [10.7, 60],
        passengerDeviationBudget: 10,
      }),
      'ENT:Authority:ENT',
      tenMinPerLeg
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    // Order: Origin(09:00) -> Inter A(09:10) -> Pickup(09:20) -> Inter B(09:30)
    //   -> Dropoff(09:40) -> Destination(09:50).
    expect(calls[0].expectedDepartureTime).toBe('2026-06-01T09:00:00.000Z');
    expect(calls[1].expectedArrivalTime).toBe('2026-06-01T09:10:00.000Z'); // Inter A
    expect(calls[2].expectedDepartureTime).toBe('2026-06-01T09:20:00.000Z'); // Pickup
    expect(calls[4].expectedArrivalTime).toBe('2026-06-01T09:40:00.000Z'); // Dropoff
    expect(calls[5].expectedArrivalTime).toBe('2026-06-01T09:50:00.000Z'); // Destination

    // latestExpectedArrivalTime = scheduled time + 10 min deviation budget.
    expect(calls[2].latestExpectedArrivalTime).toBe('2026-06-01T09:30:00.000Z'); // Pickup
    expect(calls[4].latestExpectedArrivalTime).toBe('2026-06-01T09:50:00.000Z'); // Dropoff
  });

  it('keeps the existing estimate when the router cannot plan a leg', async () => {
    const failingRouter: RouteLeg = async () => null;

    const result = await prepareBookingData(
      tripWithIntermediates(),
      baseBooking({ pickupCoordinates: [10.3, 60], dropoffCoordinates: [10.7, 60] }),
      'ENT:Authority:ENT',
      failingRouter
    );

    // Falls back to the 1/3–2/3 estimate rather than producing broken times.
    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    const pickup = calls.find(c => c.stopPointName.startsWith('Passenger Pickup'));
    expect(pickup?.expectedDepartureTime).toBe('2026-06-01T11:00:00.000Z');
  });

  describe('previewBookingRoute', () => {
    it('returns the inserted, reordered stops with per-stop occupancy and no over-capacity flag', () => {
      const preview = previewBookingRoute(
        tripWithIntermediates(),
        baseBooking({
          pickupCoordinates: [10.3, 60],
          dropoffCoordinates: [10.7, 60],
          numberOfPassengers: 2,
        })
      );

      expect(preview).not.toBeNull();
      expect(preview!.overCapacityStopIndex).toBeNull();
      expect(preview!.calls.map(c => c.stopPointName.replace(/ \(.*/, ''))).toEqual([
        'Origin',
        'Inter A',
        'Passenger Pickup',
        'Inter B',
        'Passenger Dropoff',
        'Destination',
      ]);
      expect(preview!.calls.map(c => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(preview!.calls.map(c => c.expectedDepartureOccupancy?.[0]?.onboardCount)).toEqual([
        1, 1, 3, 3, 1, 1,
      ]);

      // The pickup/dropoff refs point at this booking's own stops, so the UI
      // can label them distinctly from the driver's and other passengers' stops.
      const pickup = preview!.calls.find(c => c.stopPointRef === preview!.pickupStopRef);
      const dropoff = preview!.calls.find(c => c.stopPointRef === preview!.dropoffStopRef);
      expect(pickup?.stopPointName).toMatch(/^Passenger Pickup/);
      expect(dropoff?.stopPointName).toMatch(/^Passenger Dropoff/);
    });

    it('flags the over-capacity stop instead of throwing', () => {
      // Driver (1) + 4 passengers = 5 on board, capacity 4.
      const preview = previewBookingRoute(
        tripWithIntermediates(),
        baseBooking({
          pickupCoordinates: [10.3, 60],
          dropoffCoordinates: [10.7, 60],
          numberOfPassengers: 4,
        })
      );

      expect(preview).not.toBeNull();
      // Over capacity first occurs when the 4 passengers board, at the pickup
      // (index 2: Origin, Inter A, Passenger Pickup, ...).
      expect(preview!.overCapacityStopIndex).toBe(2);
      expect(preview!.calls[preview!.overCapacityStopIndex!].stopPointName).toMatch(
        /^Passenger Pickup/
      );
    });

    it('returns null when a preview cannot be built', () => {
      const trip = baseTrip();
      trip.estimatedVehicleJourney.estimatedCalls.estimatedCall =
        trip.estimatedVehicleJourney.estimatedCalls.estimatedCall.slice(0, 1);

      expect(previewBookingRoute(trip, baseBooking())).toBeNull();
    });

    it('always keeps pickup before dropoff, even when shortest path would invert them', () => {
      // Origin(10.0) -> Destination(11.0). Pickup is near the destination (10.8),
      // dropoff near the origin (10.2): the shortest path would visit dropoff
      // first. The precedence constraint must override that.
      const trip = {
        id: 'ENT:ServiceJourney:1',
        estimatedVehicleJourney: {
          recordedAtTime: '2026-05-20T09:00:00.000Z',
          lineRef: 'ENT:CarPooling:trip-1',
          publishedLineName: 'Carpooling trip',
          estimatedCalls: {
            estimatedCall: [
              stop('Origin', 10.0, 1, {
                aimedDepartureTime: '2026-06-01T09:00:00.000Z',
                expectedDepartureTime: '2026-06-01T09:00:00.000Z',
                expectedDepartureOccupancy: [{ onboardCount: 1 }],
                expectedDepartureCapacities: [{ totalCapacity: 4 }],
              }),
              stop('Destination', 11.0, 2, {
                aimedArrivalTime: '2026-06-01T15:00:00.000Z',
                expectedArrivalTime: '2026-06-01T15:00:00.000Z',
              }),
            ],
          },
        },
      } as Extrajourney;

      const preview = previewBookingRoute(
        trip,
        baseBooking({ pickupCoordinates: [10.8, 60], dropoffCoordinates: [10.2, 60] })
      )!;

      const pickupIndex = preview.calls.findIndex(c => c.stopPointRef === preview.pickupStopRef);
      const dropoffIndex = preview.calls.findIndex(c => c.stopPointRef === preview.dropoffStopRef);
      expect(pickupIndex).toBeGreaterThan(0); // after origin
      expect(pickupIndex).toBeLessThan(dropoffIndex); // pickup before dropoff
      expect(preview.calls.map(c => c.stopPointName.replace(/ \(.*/, ''))).toEqual([
        'Origin',
        'Passenger Pickup',
        'Passenger Dropoff',
        'Destination',
      ]);
    });
  });

  describe('routedBookingPreview', () => {
    it('re-times every stop — not just pickup/dropoff — with routed driving times', async () => {
      const tenMinPerLeg: RouteLeg = async (_from, _to, dateTime) => ({
        expectedStartTime: dateTime,
        expectedEndTime: dayjs(dateTime).add(10, 'minute').toISOString(),
        duration: 600,
        distance: 1000,
      });

      const preview = await routedBookingPreview(
        tripWithIntermediates(),
        baseBooking({ pickupCoordinates: [10.3, 60], dropoffCoordinates: [10.7, 60] }),
        tenMinPerLeg
      );

      expect(preview).not.toBeNull();
      // Order: Origin(09:00) -> Inter A(09:10) -> Pickup(09:20) -> Inter B(09:30)
      //   -> Dropoff(09:40) -> Destination(09:50). Crucially the intermediate
      //   stops are re-timed, not left at their original values.
      const times = preview!.calls.map(c => c.expectedArrivalTime ?? c.expectedDepartureTime);
      expect(times).toEqual([
        '2026-06-01T09:00:00.000Z',
        '2026-06-01T09:10:00.000Z', // Inter A (re-timed)
        '2026-06-01T09:20:00.000Z', // Pickup
        '2026-06-01T09:30:00.000Z', // Inter B (re-timed)
        '2026-06-01T09:40:00.000Z', // Dropoff
        '2026-06-01T09:50:00.000Z', // Destination
      ]);
      // One geometry per leg. The stub returns no street geometry, so each
      // leg falls back to the straight segment between its stops — still
      // drawable end to end.
      expect(preview!.legGeometries).toHaveLength(preview!.calls.length - 1);
      preview!.legGeometries!.forEach(leg => expect(leg).toHaveLength(2));
    });

    it('returns no leg geometries when a leg cannot be routed', async () => {
      const failingRouter: RouteLeg = async () => null;

      const preview = await routedBookingPreview(
        tripWithIntermediates(),
        baseBooking({ pickupCoordinates: [10.3, 60], dropoffCoordinates: [10.7, 60] }),
        failingRouter
      );

      expect(preview).not.toBeNull();
      expect(preview!.legGeometries).toBeNull();
    });
  });
});
