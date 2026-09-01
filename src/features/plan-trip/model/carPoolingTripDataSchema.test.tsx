import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { carPoolingTripDataSchema, TRIP_EXPIRY_DAYS } from './carPoolingTripDataSchema';

// Departure validation is relative to "now" (a trip too far in the past expires
// instantly in the backend), so base fixtures on the current time rather than a
// fixed calendar date that would drift into the past as the suite ages.
const validInput = () => ({
  dataSource: 'ENT',
  departureStopName: 'Oslo S',
  departureDatetime: dayjs().add(1, 'day'),
  departureFlexibleStop: [10.7522, 59.9139],
  departureCancellation: false,
  destinationStopName: 'Bergen stasjon',
  destinationDatetime: dayjs().add(1, 'day').add(7, 'hour'),
  destinationFlexibleStop: [5.3221, 60.3913],
  destinationCancellation: false,
  intermediateCalls: [],
  tripCancellation: false,
  driverDeviationBudget: 30,
  contactUrl: 'https://example.com',
  totalCapacity: 4,
  onboardCount: 1,
});

describe('carPoolingTripDataSchema', () => {
  it('accepts a fully-populated valid input', async () => {
    await expect(carPoolingTripDataSchema.validate(validInput())).resolves.toBeDefined();
  });

  it.each(['departureStopName', 'destinationStopName'])(
    'requires %s to be at least 2 characters',
    async field => {
      await expect(
        carPoolingTripDataSchema.validate({ ...validInput(), [field]: 'a' })
      ).rejects.toThrow(/at least 2 characters/);
    }
  );

  it.each(['departureStopName', 'destinationStopName'])(
    'accepts a two-letter place name for %s',
    async field => {
      // Automatic stop naming produces real place names, and Ås, Ål and Ed are
      // two letters long.
      await expect(
        carPoolingTripDataSchema.validate({ ...validInput(), [field]: 'Ås' })
      ).resolves.toBeDefined();
    }
  );

  it('requires dataSource', async () => {
    const input = { ...validInput(), dataSource: undefined };
    await expect(carPoolingTripDataSchema.validate(input)).rejects.toThrow();
  });

  it('requires departureFlexibleStop with a helpful message', async () => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), departureFlexibleStop: undefined })
    ).rejects.toThrow(/Please place the departure stop on the map/);
  });

  it('requires destinationFlexibleStop with a helpful message', async () => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), destinationFlexibleStop: undefined })
    ).rejects.toThrow(/Please place the destination stop on the map/);
  });

  it('rejects flexibleStop values that are not [lng, lat] pairs', async () => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), departureFlexibleStop: [10] })
    ).rejects.toThrow(/Must be \[lng, lat\]/);
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), departureFlexibleStop: ['x', 'y'] })
    ).rejects.toThrow(/Must be \[lng, lat\]/);
  });

  it.each(['driverDeviationBudget', 'totalCapacity', 'onboardCount'])(
    'requires %s to be a non-negative integer',
    async field => {
      await expect(
        carPoolingTripDataSchema.validate({ ...validInput(), [field]: -1 })
      ).rejects.toThrow(/zero or a positive integer/);
      await expect(
        carPoolingTripDataSchema.validate({ ...validInput(), [field]: 1.5 })
      ).rejects.toThrow(/Must be an integer/);
    }
  );

  it('requires driverDeviationBudget to be present', async () => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), driverDeviationBudget: undefined })
    ).rejects.toThrow();
  });

  it('rejects contactUrl values that are not URLs', async () => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), contactUrl: 'not a url' })
    ).rejects.toThrow(/Must be a valid URL/);
  });

  it('accepts a localhost booking URL with a port', async () => {
    await expect(
      carPoolingTripDataSchema.validate({
        ...validInput(),
        contactUrl: 'http://localhost:5000/book-trip/uZY6L54a6UITdSSAhMaE',
      })
    ).resolves.toBeDefined();
  });

  it("transforms '' to null for contactUrl, totalCapacity, and onboardCount", async () => {
    const result = await carPoolingTripDataSchema.validate({
      ...validInput(),
      contactUrl: '',
      totalCapacity: '',
      onboardCount: '',
    });

    expect(result.contactUrl).toBeNull();
    expect(result.totalCapacity).toBeNull();
    expect(result.onboardCount).toBeNull();
  });

  it('rejects an invalid dayjs value', async () => {
    await expect(
      carPoolingTripDataSchema.validate({
        ...validInput(),
        departureDatetime: dayjs('not-a-date'),
      })
    ).rejects.toThrow(/Not a valid date/);
  });

  it('rejects a departure more than 2 days in the past', async () => {
    await expect(
      carPoolingTripDataSchema.validate({
        ...validInput(),
        departureDatetime: dayjs().subtract(TRIP_EXPIRY_DAYS, 'day').subtract(1, 'hour'),
      })
    ).rejects.toThrow(/expire immediately and never reach the journey planner/);
  });

  it('accepts a departure within the last 2 days', async () => {
    await expect(
      carPoolingTripDataSchema.validate({
        ...validInput(),
        departureDatetime: dayjs().subtract(1, 'day'),
      })
    ).resolves.toBeDefined();
  });
});
