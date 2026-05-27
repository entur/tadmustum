import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import mapToFormData from './mapToFormData';
import prepareCarpoolingFormData from '../../../shared/api/prepareCarpoolingFormData';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData';

// Fields whose dayjs values are compared by ISO instant rather than reference.
const toComparable = (form: CarPoolingTripDataFormData) => ({
  ...form,
  departureDatetime: form.departureDatetime.toISOString(),
  destinationDatetime: form.destinationDatetime.toISOString(),
});

describe('mapToFormData (round-trip with prepareCarpoolingFormData)', () => {
  it('round-trips every form field through the SIRI payload', () => {
    const original: CarPoolingTripDataFormData = {
      codespace: 'ENT',
      authority: 'ENT:Authority:ENT',
      operator: 'ENT:Operator:1',
      id: 'ENT:ServiceJourney:42',
      lineRef: 'ENT:Line:existing',
      estimatedVehicleJourneyCode: 'EVJ-42',
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
    };

    const payload = prepareCarpoolingFormData(original);
    const roundTripped = mapToFormData(payload.input);

    expect(toComparable(roundTripped)).toEqual(toComparable(original));
  });

  it('round-trips cancellation flags on departure and destination', () => {
    const original: CarPoolingTripDataFormData = {
      codespace: 'ENT',
      authority: 'ENT:Authority:ENT',
      operator: 'ENT:Operator:1',
      id: 'ENT:ServiceJourney:42',
      lineRef: 'ENT:Line:existing',
      estimatedVehicleJourneyCode: 'EVJ-42',
      departureStopName: 'Oslo S',
      departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
      departureFlexibleStop: [10.7522, 59.9139],
      departureCancellation: true,
      destinationStopName: 'Bergen stasjon',
      destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
      destinationFlexibleStop: [5.3221, 60.3913],
      destinationCancellation: true,
      intermediateCalls: [],
      tripCancellation: false,
      driverDeviationBudget: 30,
      contactUrl: 'https://example.com/driver/1',
      totalCapacity: 4,
      onboardCount: 1,
    };

    const payload = prepareCarpoolingFormData(original);
    const roundTripped = mapToFormData(payload.input);

    expect(roundTripped.departureCancellation).toBe(true);
    expect(roundTripped.destinationCancellation).toBe(true);
  });

  it('round-trips tripCancellation through estimatedVehicleJourney.cancellation', () => {
    const original: CarPoolingTripDataFormData = {
      codespace: 'ENT',
      authority: 'ENT:Authority:ENT',
      operator: 'ENT:Operator:1',
      id: 'ENT:ServiceJourney:42',
      lineRef: 'ENT:Line:existing',
      estimatedVehicleJourneyCode: 'EVJ-42',
      departureStopName: 'Oslo S',
      departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
      departureFlexibleStop: [10.7522, 59.9139],
      departureCancellation: false,
      destinationStopName: 'Bergen stasjon',
      destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
      destinationFlexibleStop: [5.3221, 60.3913],
      destinationCancellation: false,
      intermediateCalls: [],
      tripCancellation: true,
      driverDeviationBudget: 30,
      contactUrl: 'https://example.com/driver/1',
      totalCapacity: 4,
      onboardCount: 1,
    };

    const payload = prepareCarpoolingFormData(original);
    expect(payload.input.estimatedVehicleJourney.cancellation).toBe(true);

    const roundTripped = mapToFormData(payload.input);
    expect(roundTripped.tripCancellation).toBe(true);
  });

  it('preserves intermediate calls and their cancellation flags through round-trip', () => {
    const original: CarPoolingTripDataFormData = {
      codespace: 'ENT',
      authority: 'ENT:Authority:ENT',
      operator: 'ENT:Operator:1',
      id: 'ENT:ServiceJourney:42',
      lineRef: 'ENT:Line:existing',
      estimatedVehicleJourneyCode: 'EVJ-42',
      departureStopName: 'Oslo S',
      departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
      departureFlexibleStop: [10.7522, 59.9139],
      departureCancellation: false,
      destinationStopName: 'Bergen stasjon',
      destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
      destinationFlexibleStop: [5.3221, 60.3913],
      destinationCancellation: false,
      intermediateCalls: [
        {
          order: 2,
          stopPointRef: 'ENT:Pickup:1',
          stopPointName: 'Pickup A',
          destinationDisplay: 'Bergen',
          aimedDepartureTime: '2026-06-01T10:00:00.000Z',
          cancellation: true,
          departureStopAssignment: {
            expectedFlexibleArea: { circularArea: { longitude: 11, latitude: 60, radius: 1 } },
          },
        },
        {
          order: 3,
          stopPointRef: 'ENT:Dropoff:1',
          stopPointName: 'Dropoff B',
          destinationDisplay: 'Bergen',
          aimedArrivalTime: '2026-06-01T12:00:00.000Z',
          cancellation: false,
          departureStopAssignment: {
            expectedFlexibleArea: { circularArea: { longitude: 11, latitude: 60, radius: 1 } },
          },
        },
      ],
      tripCancellation: false,
      driverDeviationBudget: 30,
      contactUrl: 'https://example.com/driver/1',
      totalCapacity: 4,
      onboardCount: 1,
    };

    const payload = prepareCarpoolingFormData(original);
    const roundTripped = mapToFormData(payload.input);

    expect(roundTripped.intermediateCalls).toHaveLength(2);
    expect(roundTripped.intermediateCalls[0]).toMatchObject({
      stopPointName: 'Pickup A',
      cancellation: true,
    });
    expect(roundTripped.intermediateCalls[1]).toMatchObject({
      stopPointName: 'Dropoff B',
      cancellation: false,
    });
  });

  it('round-trips when optional numeric/url fields are null', () => {
    const original: CarPoolingTripDataFormData = {
      codespace: 'ENT',
      authority: 'ENT:Authority:ENT',
      operator: 'ENT:Operator:1',
      id: 'ENT:ServiceJourney:42',
      lineRef: 'ENT:Line:existing',
      estimatedVehicleJourneyCode: 'EVJ-42',
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
      driverDeviationBudget: 15,
      contactUrl: null,
      totalCapacity: null,
      onboardCount: null,
    };

    const payload = prepareCarpoolingFormData(original);
    const roundTripped = mapToFormData(payload.input);

    expect(toComparable(roundTripped)).toEqual(toComparable(original));
  });
});
