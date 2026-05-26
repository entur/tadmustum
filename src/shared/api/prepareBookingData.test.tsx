import { describe, expect, it, vi } from 'vitest';
import { prepareBookingData, type PassengerBookingData } from './prepareBookingData';
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
  it('throws when the original trip has no id', () => {
    const trip = baseTrip();
    delete (trip as { id?: string }).id;

    expect(() => prepareBookingData(trip, baseBooking())).toThrow(/must have an ID/);
  });

  it('throws when the original trip has fewer than 2 stops', () => {
    const trip = baseTrip();
    trip.estimatedVehicleJourney.estimatedCalls.estimatedCall =
      trip.estimatedVehicleJourney.estimatedCalls.estimatedCall.slice(0, 1);

    expect(() => prepareBookingData(trip, baseBooking())).toThrow(/at least 2 stops/);
  });

  it('preserves the original trip id', () => {
    const result = prepareBookingData(baseTrip(), baseBooking());

    expect(result.input.id).toBe('ENT:ServiceJourney:1');
  });

  it('inserts pickup and dropoff between the original first and last stops and reorders them', () => {
    const result = prepareBookingData(baseTrip(), baseBooking());

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

  it('formats pickup and dropoff stop names with lat,lng to 4 decimals', () => {
    const result = prepareBookingData(baseTrip(), baseBooking());

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].stopPointName).toBe('Passenger Pickup (59.9139, 10.7522)');
    expect(calls[2].stopPointName).toBe('Passenger Dropoff (60.3913, 5.3221)');
  });

  it('places pickup at 1/3 and dropoff at 2/3 of the journey when times are not provided', () => {
    // Journey is 09:00 -> 15:00 = 6h. 1/3 = 11:00, 2/3 = 13:00.
    const result = prepareBookingData(baseTrip(), baseBooking());

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].aimedDepartureTime).toBe('2026-06-01T11:00:00.000Z');
    expect(calls[1].expectedDepartureTime).toBe('2026-06-01T11:00:00.000Z');
    expect(calls[2].aimedArrivalTime).toBe('2026-06-01T13:00:00.000Z');
    expect(calls[2].expectedArrivalTime).toBe('2026-06-01T13:00:00.000Z');
  });

  it('respects explicit pickupTime and dropoffTime when provided', () => {
    const result = prepareBookingData(
      baseTrip(),
      baseBooking({
        pickupTime: '2026-06-01T10:15:00.000Z',
        dropoffTime: '2026-06-01T14:45:00.000Z',
      })
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].aimedDepartureTime).toBe('2026-06-01T10:15:00.000Z');
    expect(calls[2].aimedArrivalTime).toBe('2026-06-01T14:45:00.000Z');
  });

  it('adds passengerDeviationBudget to derive latestExpectedArrivalTime', () => {
    const result = prepareBookingData(baseTrip(), baseBooking({ passengerDeviationBudget: 15 }));

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].latestExpectedArrivalTime).toBe('2026-06-01T11:15:00.000Z');
    expect(calls[2].latestExpectedArrivalTime).toBe('2026-06-01T13:15:00.000Z');
  });

  it('omits latestExpectedArrivalTime when passengerDeviationBudget is not provided', () => {
    const result = prepareBookingData(
      baseTrip(),
      baseBooking({ passengerDeviationBudget: undefined })
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].latestExpectedArrivalTime).toBeUndefined();
    expect(calls[2].latestExpectedArrivalTime).toBeUndefined();
  });

  it('increments the onboard count by the number of passengers at pickup', () => {
    const result = prepareBookingData(baseTrip(), baseBooking({ numberOfPassengers: 3 }));

    const pickup = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall[1];
    expect(pickup.expectedDepartureOccupancy?.[0].onboardCount).toBe(4); // 1 (existing) + 3
  });

  it('inherits totalCapacity from the original first stop', () => {
    const result = prepareBookingData(baseTrip(), baseBooking());

    const pickup = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall[1];
    const dropoff = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall[2];
    expect(pickup.expectedDepartureCapacities).toEqual([{ totalCapacity: 4 }]);
    expect(dropoff.expectedDepartureCapacities).toEqual([{ totalCapacity: 4 }]);
  });

  it('inherits destinationDisplay from the original last stop', () => {
    const result = prepareBookingData(baseTrip(), baseBooking());

    const calls = result.input.estimatedVehicleJourney.estimatedCalls.estimatedCall;
    expect(calls[1].destinationDisplay).toBe('Bergen');
    expect(calls[2].destinationDisplay).toBe('Bergen');
  });
});
