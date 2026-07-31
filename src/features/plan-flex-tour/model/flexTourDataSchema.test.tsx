import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  flexTourDataSchema,
  MINIMUM_BOOKED_STOPS,
  stopsOverlappingDwell,
  tourSpanHours,
} from './flexTourDataSchema';
import type { FlexTourBookedStop, FlexTourFormData } from './FlexTourFormData';

const bookedStop = (overrides: Partial<FlexTourBookedStop> = {}): FlexTourBookedStop => ({
  featureId: 'feature-1',
  position: [10.4, 63.42],
  stopName: 'Pickup',
  arrivalDatetime: dayjs().add(1, 'day').hour(9).minute(10),
  deviationBudget: 15,
  onboardCount: 2,
  ...overrides,
});

const baseForm = (overrides: Partial<FlexTourFormData> = {}): FlexTourFormData => ({
  dataSource: 'MAL',
  operator: 'NOG:Operator:9BqxmisyqMG',
  serviceJourneyRef: 'MAL:ServiceJourney:0e20a3a3-86b5-4e14-a798-1f0c052a435d',
  serviceDate: dayjs().add(1, 'day'),
  lineRef: 'MAL:FlexibleLine:5ca5e3c6-00fd-4224-95a5-ab8ff60c072e',
  totalCapacity: 16,
  tourCancellation: false,
  dwellMinutes: 1,
  bookedStops: [
    bookedStop(),
    bookedStop({ arrivalDatetime: dayjs().add(1, 'day').hour(9).minute(45) }),
  ],
  ...overrides,
});

const errorFor = async (form: FlexTourFormData): Promise<string[]> => {
  try {
    await flexTourDataSchema.validate(form, { abortEarly: false });
    return [];
  } catch (e) {
    return (e as { errors: string[] }).errors;
  }
};

describe('flexTourDataSchema', () => {
  it('accepts a well-formed tour', async () => {
    expect(await errorFor(baseForm())).toEqual([]);
  });

  it('requires a ServiceJourney reference in the expected shape', async () => {
    const errors = await errorFor(baseForm({ serviceJourneyRef: 'not-a-reference' }));

    expect(errors.join(' ')).toMatch(/ServiceJourney/);
  });

  it('rejects a service date more than the grace period in the past', async () => {
    const errors = await errorFor(baseForm({ serviceDate: dayjs().subtract(5, 'day') }));

    expect(errors.join(' ')).toMatch(/expire immediately/);
  });

  it('accepts a service date inside the grace period', async () => {
    const errors = await errorFor(baseForm({ serviceDate: dayjs().subtract(1, 'day') }));

    expect(errors.join(' ')).not.toMatch(/expire immediately/);
  });

  // Two calls is OTP's own floor: with fewer it drops the tour and falls back to static flex.
  it(`requires at least ${MINIMUM_BOOKED_STOPS} booked stops`, async () => {
    const errors = await errorFor(baseForm({ bookedStops: [] }));

    expect(errors.join(' ')).toMatch(/at least 2 booked stops/);
  });

  it('rejects a tour with a single stop', async () => {
    const errors = await errorFor(baseForm({ bookedStops: [bookedStop()] }));

    expect(errors.join(' ')).toMatch(/at least 2 booked stops/);
  });

  it('requires every booked stop to be placed on the map', async () => {
    const errors = await errorFor(
      baseForm({ bookedStops: [bookedStop({ position: null }), bookedStop()] })
    );

    expect(errors.join(' ')).toMatch(/Place this stop on the map/);
  });

  it('rejects booked stops that are out of time order', async () => {
    const errors = await errorFor(
      baseForm({
        bookedStops: [
          bookedStop({ arrivalDatetime: dayjs().add(1, 'day').hour(10).minute(0) }),
          bookedStop({ arrivalDatetime: dayjs().add(1, 'day').hour(9).minute(0) }),
        ],
      })
    );

    expect(errors.join(' ')).toMatch(/increasing time order/);
  });

  it('rejects a negative deviation budget', async () => {
    const errors = await errorFor(
      baseForm({ bookedStops: [bookedStop({ deviationBudget: -1 }), bookedStop()] })
    );

    expect(errors.join(' ')).toMatch(/zero or a positive integer/);
  });
});

describe('tourSpanHours', () => {
  it('measures from the first call’s departure to the last stop’s latest expected arrival', () => {
    const stops = [
      { arrivalDatetime: dayjs('2026-08-03T09:00:00.000Z'), deviationBudget: 0 },
      { arrivalDatetime: dayjs('2026-08-03T10:00:00.000Z'), deviationBudget: 30 },
    ];

    // The first call departs at 09:00 + 1 min dwell; the last arrives 10:00 with 30 min of
    // budget left, so OTP sees 10:30 - 09:01.
    expect(tourSpanHours(stops, 1)).toBeCloseTo(1.4833, 3);
  });

  it('returns null before there are two stops to span', () => {
    expect(tourSpanHours(undefined, 1)).toBeNull();
    expect(tourSpanHours([], 1)).toBeNull();
    expect(tourSpanHours([{ arrivalDatetime: dayjs(), deviationBudget: 0 }], 1)).toBeNull();
  });
});

describe('stopsOverlappingDwell', () => {
  it('flags a stop reached before the previous stop’s dwell is over', () => {
    const stops = [
      { arrivalDatetime: dayjs('2026-08-03T09:00:00.000Z') },
      // Only 5 min later, but the vehicle stands 10 min at every stop.
      { arrivalDatetime: dayjs('2026-08-03T09:05:00.000Z') },
      { arrivalDatetime: dayjs('2026-08-03T09:30:00.000Z') },
    ];

    expect(stopsOverlappingDwell(stops, 10)).toEqual([1]);
    expect(stopsOverlappingDwell(stops, 1)).toEqual([]);
  });
});
