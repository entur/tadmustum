import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { flexTourDataSchema, tourSpanHours } from './flexTourDataSchema';
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
  anchorFeatureId: 'anchor',
  anchorPosition: [10.3951, 63.4305],
  anchorStopName: 'Vehicle position',
  anchorDepartureDatetime: dayjs().add(1, 'day').hour(9).minute(0),
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

  it('requires at least one booked stop', async () => {
    const errors = await errorFor(baseForm({ bookedStops: [] }));

    expect(errors.join(' ')).toMatch(/at least one booked stop/);
  });

  it('requires the vehicle position to be placed on the map', async () => {
    const errors = await errorFor(baseForm({ anchorPosition: null }));

    expect(errors.join(' ')).toMatch(/Place the vehicle/);
  });

  it('requires every booked stop to be placed on the map', async () => {
    const errors = await errorFor(baseForm({ bookedStops: [bookedStop({ position: null })] }));

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
    const errors = await errorFor(baseForm({ bookedStops: [bookedStop({ deviationBudget: -1 })] }));

    expect(errors.join(' ')).toMatch(/zero or a positive integer/);
  });
});

describe('tourSpanHours', () => {
  it('measures to the last stop’s latest expected arrival, not its expected arrival', () => {
    const start = dayjs('2026-08-03T09:00:00.000Z');
    const stops = [{ arrivalDatetime: dayjs('2026-08-03T10:00:00.000Z'), deviationBudget: 30 }];

    // 09:00 -> 10:00 arrival + 30 min budget = 1.5 h, the span OTP checks.
    expect(tourSpanHours(start, stops)).toBeCloseTo(1.5);
  });

  it('returns null while either end is missing', () => {
    expect(tourSpanHours(undefined, [])).toBeNull();
    expect(tourSpanHours(dayjs(), [])).toBeNull();
  });
});
