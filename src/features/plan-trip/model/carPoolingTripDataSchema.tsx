import { Dayjs } from 'dayjs';
import * as Yup from 'yup';
import type { Position } from 'geojson';

declare module 'yup' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface MixedSchema<TType, TContext, TDefault, TFlags> {
    dayjs(message?: string): this;
  }
}

Yup.addMethod(Yup.mixed, 'dayjs', function (message = 'Invalid date') {
  return this.test('dayjs', message, value => {
    return !value || (value as Dayjs).isValid();
  });
});

const positionSchema = Yup.mixed<Position>()
  .nullable()
  .test('is-position', 'Must be [lng, lat]', value => {
    return (
      value === null ||
      value === undefined ||
      (Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number')
    );
  });

const dateSchema = Yup.mixed<Dayjs>().dayjs('Not a valid date');

export const carPoolingTripDataSchema = Yup.object({
  authority: Yup.string().required(),
  operator: Yup.string()
    .required()
    // The operator field is currently dead data downstream (see ROR pipeline:
    // tadmustum -> nunamnir -> subula -> nusku, and OTP's CarpoolTrip.provider
    // — no consumer reads it). Until something actually depends on the value,
    // restrict to Entur to avoid producing data that might be wrong but never
    // noticed.
    .matches(/^ENT:/, 'Only Entur is accepted as operator for now'),
  departureStopName: Yup.string()
    .min(3, 'Departure stop name must be at least 3 characters')
    .required(),
  departureDatetime: dateSchema.required(),
  departureFlexibleStop: positionSchema.required('Please place the departure stop on the map.'),
  departureCancellation: Yup.boolean().required(),
  destinationStopName: Yup.string()
    .min(3, 'Destination stop name must be at least 3 characters')
    .required(),
  destinationDatetime: dateSchema.required(),
  destinationFlexibleStop: positionSchema.required('Please place the destination stop on the map.'),
  destinationCancellation: Yup.boolean().required(),
  intermediateCalls: Yup.array().required(),
  tripCancellation: Yup.boolean().required(),
  driverDeviationBudget: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .required(),
  contactUrl: Yup.string()
    .nullable()
    .defined()
    .transform((value, original) => (original === '' ? null : value))
    // Yup's built-in .url() rejects hosts without a dot (e.g. localhost), so
    // validate with the native URL parser, which accepts localhost and ports.
    .test('is-url', 'Must be a valid URL', value => {
      if (value === null || value === undefined || value === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }),
  totalCapacity: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .nullable()
    .defined()
    .transform((value, original) => (original === '' ? null : value)),
  onboardCount: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .nullable()
    .defined()
    .transform((value, original) => (original === '' ? null : value)),
});
