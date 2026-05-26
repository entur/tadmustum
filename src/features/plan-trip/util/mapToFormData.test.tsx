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
      departureDestinationDisplay: 'Oslo S',
      destinationDestinationDisplay: 'Bergen stasjon',
      departureStopName: 'Oslo S',
      departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
      departureFlexibleStop: [10.7522, 59.9139],
      destinationStopName: 'Bergen stasjon',
      destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
      destinationFlexibleStop: [5.3221, 60.3913],
      driverDeviationBudget: 30,
      contactUrl: 'https://example.com/driver/1',
      totalCapacity: 4,
      onboardCount: 1,
    };

    const payload = prepareCarpoolingFormData(original);
    const roundTripped = mapToFormData(payload.input);

    expect(toComparable(roundTripped)).toEqual(toComparable(original));
  });

  it('round-trips when optional numeric/url fields are null', () => {
    const original: CarPoolingTripDataFormData = {
      codespace: 'ENT',
      authority: 'ENT:Authority:ENT',
      operator: 'ENT:Operator:1',
      id: 'ENT:ServiceJourney:42',
      lineRef: 'ENT:Line:existing',
      estimatedVehicleJourneyCode: 'EVJ-42',
      departureDestinationDisplay: 'Oslo S',
      destinationDestinationDisplay: 'Bergen stasjon',
      departureStopName: 'Oslo S',
      departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
      departureFlexibleStop: [10.7522, 59.9139],
      destinationStopName: 'Bergen stasjon',
      destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
      destinationFlexibleStop: [5.3221, 60.3913],
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
