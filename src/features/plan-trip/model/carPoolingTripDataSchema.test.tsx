import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { carPoolingTripDataSchema } from './carPoolingTripDataSchema';

const validInput = () => ({
  codespace: 'ENT',
  authority: 'ENT:Authority:ENT',
  operator: 'ENT:Operator:1',
  departureDestinationDisplay: 'Oslo',
  destinationDestinationDisplay: 'Bergen',
  departureStopName: 'Oslo S',
  departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
  departureFlexibleStop: [10.7522, 59.9139],
  destinationStopName: 'Bergen stasjon',
  destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
  destinationFlexibleStop: [5.3221, 60.3913],
  driverDeviationBudget: 30,
  contactUrl: 'https://example.com',
  totalCapacity: 4,
  onboardCount: 1,
});

describe('carPoolingTripDataSchema', () => {
  it('accepts a fully-populated valid input', async () => {
    await expect(carPoolingTripDataSchema.validate(validInput())).resolves.toBeDefined();
  });

  it('requires codespace to be exactly 3 characters', async () => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), codespace: 'EN' })
    ).rejects.toThrow();
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), codespace: 'ENTX' })
    ).rejects.toThrow();
  });

  it.each([
    'departureDestinationDisplay',
    'destinationDestinationDisplay',
    'departureStopName',
    'destinationStopName',
  ])('requires %s to be at least 3 characters', async field => {
    await expect(
      carPoolingTripDataSchema.validate({ ...validInput(), [field]: 'ab' })
    ).rejects.toThrow(/at least 3 characters/);
  });

  it.each(['authority', 'operator'])('requires %s', async field => {
    const input = { ...validInput(), [field]: undefined };
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
});
