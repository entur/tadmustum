import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import prepareCarpoolingFormData from './prepareCarpoolingFormData';
import type { CarPoolingTripDataFormData } from '../../features/plan-trip/model/CarPoolingTripDataFormData';

vi.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

const baseForm = (
  overrides: Partial<CarPoolingTripDataFormData> = {}
): CarPoolingTripDataFormData => ({
  codespace: 'ENT',
  authority: 'ENT:Authority:ENT',
  operator: 'ENT:Operator:1',
  departureDestinationDisplay: 'Oslo',
  destinationDestinationDisplay: 'Bergen',
  departureStopName: 'Oslo S',
  departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
  departureFlexibleStop: [10.7522, 59.9139],
  departureCancellation: false,
  destinationStopName: 'Bergen stasjon',
  destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
  destinationFlexibleStop: [5.3221, 60.3913],
  destinationCancellation: false,
  intermediateCalls: [],
  tripCancellation: false,
  driverDeviationBudget: 30,
  contactUrl: 'https://example.com/driver/1',
  totalCapacity: 4,
  onboardCount: 1,
  ...overrides,
});

describe('prepareCarpoolingFormData', () => {
  it('maps departure and destination into SIRI estimated calls', () => {
    const result = prepareCarpoolingFormData(baseForm());

    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls).toHaveLength(2);

    expect(calls[0]).toMatchObject({
      order: 1,
      stopPointName: 'Oslo S',
      destinationDisplay: 'Oslo',
      aimedDepartureTime: '2026-06-01T08:00:00.000Z',
      expectedDepartureTime: '2026-06-01T08:00:00.000Z',
      departureBoardingActivity: 'boarding',
    });

    expect(calls[1]).toMatchObject({
      order: 2,
      stopPointName: 'Bergen stasjon',
      destinationDisplay: 'Bergen',
      aimedArrivalTime: '2026-06-01T15:00:00.000Z',
      expectedArrivalTime: '2026-06-01T15:00:00.000Z',
      arrivalBoardingActivity: 'alighting',
    });
  });

  it('encodes flexible stops as CircularArea with sentinel radius', () => {
    const result = prepareCarpoolingFormData(baseForm());

    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls[0].departureStopAssignment?.expectedFlexibleArea?.circularArea).toEqual({
      longitude: 10.7522,
      latitude: 59.9139,
      radius: 1,
    });
    expect(calls[1].departureStopAssignment?.expectedFlexibleArea?.circularArea).toEqual({
      longitude: 5.3221,
      latitude: 60.3913,
      radius: 1,
    });
  });

  it('derives latestExpectedArrivalTime from driverDeviationBudget', () => {
    const result = prepareCarpoolingFormData(baseForm({ driverDeviationBudget: 45 }));

    const arrival = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall[1];
    expect(arrival.latestExpectedArrivalTime).toBe('2026-06-01T15:45:00.000Z');
  });

  it('sets expiresAtEpochMs to 7 days after the destination time', () => {
    const result = prepareCarpoolingFormData(baseForm());

    expect(result.input.estimatedVehicleJourney.expiresAtEpochMs).toBe(
      dayjs('2026-06-08T15:00:00.000Z').valueOf()
    );
  });

  it('generates a lineRef using the codespace and a uuid when none is provided', () => {
    const result = prepareCarpoolingFormData(baseForm());

    expect(result.input.estimatedVehicleJourney.lineRef).toBe('ENT:CarPooling:fixed-uuid');
  });

  it('reuses the provided lineRef when present', () => {
    const result = prepareCarpoolingFormData(baseForm({ lineRef: 'ENT:Line:existing' }));

    expect(result.input.estimatedVehicleJourney.lineRef).toBe('ENT:Line:existing');
  });

  it('includes input.id when editing an existing trip', () => {
    const result = prepareCarpoolingFormData(baseForm({ id: 'trip-42' }));

    expect(result.input.id).toBe('trip-42');
  });

  it('omits input.id when creating a new trip', () => {
    const result = prepareCarpoolingFormData(baseForm());

    expect(result.input).not.toHaveProperty('id');
  });

  it('throws when departureFlexibleStop is missing', () => {
    expect(() => prepareCarpoolingFormData(baseForm({ departureFlexibleStop: null }))).toThrow(
      /departure and destination stops are required/
    );
  });

  it('throws when destinationFlexibleStop is missing', () => {
    expect(() => prepareCarpoolingFormData(baseForm({ destinationFlexibleStop: null }))).toThrow(
      /departure and destination stops are required/
    );
  });

  it('defaults departure and destination cancellation to false', () => {
    const result = prepareCarpoolingFormData(baseForm());

    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls[0].cancellation).toBe(false);
    expect(calls[1].cancellation).toBe(false);
  });

  it('propagates departureCancellation to the first estimated call', () => {
    const result = prepareCarpoolingFormData(baseForm({ departureCancellation: true }));

    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls[0].cancellation).toBe(true);
    expect(calls[1].cancellation).toBe(false);
  });

  it('propagates destinationCancellation to the last estimated call', () => {
    const result = prepareCarpoolingFormData(baseForm({ destinationCancellation: true }));

    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls[0].cancellation).toBe(false);
    expect(calls[1].cancellation).toBe(true);
  });

  it('defaults trip-level cancellation to false', () => {
    const result = prepareCarpoolingFormData(baseForm());

    expect(result.input.estimatedVehicleJourney.cancellation).toBe(false);
  });

  it('propagates tripCancellation to estimatedVehicleJourney.cancellation', () => {
    const result = prepareCarpoolingFormData(baseForm({ tripCancellation: true }));

    expect(result.input.estimatedVehicleJourney.cancellation).toBe(true);
  });

  it('keeps trip-level and stop-level cancellations independent', () => {
    const result = prepareCarpoolingFormData(
      baseForm({
        tripCancellation: true,
        departureCancellation: false,
        destinationCancellation: false,
      })
    );

    expect(result.input.estimatedVehicleJourney.cancellation).toBe(true);
    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls[0].cancellation).toBe(false);
    expect(calls[1].cancellation).toBe(false);
  });

  it('preserves stop cancellations even when the trip itself is not cancelled', () => {
    const result = prepareCarpoolingFormData(
      baseForm({
        tripCancellation: false,
        departureCancellation: true,
        destinationCancellation: true,
      })
    );

    expect(result.input.estimatedVehicleJourney.cancellation).toBe(false);
    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls[0].cancellation).toBe(true);
    expect(calls[1].cancellation).toBe(true);
  });

  it('inserts intermediate calls between departure and destination and renumbers order', () => {
    const result = prepareCarpoolingFormData(
      baseForm({
        intermediateCalls: [
          {
            order: 99, // overridden by renumbering
            stopPointRef: 'ENT:Pickup:1',
            stopPointName: 'Pickup A',
            destinationDisplay: 'Bergen',
            aimedDepartureTime: '2026-06-01T10:00:00.000Z',
            departureStopAssignment: {
              expectedFlexibleArea: { circularArea: { longitude: 11, latitude: 60, radius: 1 } },
            },
          },
          {
            order: 99,
            stopPointRef: 'ENT:Dropoff:1',
            stopPointName: 'Dropoff B',
            cancellation: true,
            destinationDisplay: 'Bergen',
            aimedArrivalTime: '2026-06-01T12:00:00.000Z',
            departureStopAssignment: {
              expectedFlexibleArea: { circularArea: { longitude: 11, latitude: 60, radius: 1 } },
            },
          },
        ],
      })
    );

    const calls = result.input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;
    expect(calls).toHaveLength(4);
    expect(calls.map(c => c.order)).toEqual([1, 2, 3, 4]);
    expect(calls[0].stopPointName).toBe('Oslo S');
    expect(calls[1].stopPointName).toBe('Pickup A');
    expect(calls[2].stopPointName).toBe('Dropoff B');
    expect(calls[2].cancellation).toBe(true);
    expect(calls[3].stopPointName).toBe('Bergen stasjon');
  });
});
