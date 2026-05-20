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
  codespace: Yup.string().required().length(3),
  authority: Yup.string().required(),
  operator: Yup.string().required(),
  lineName: Yup.string().min(3, 'Line name must be at least 3 characters').required(),
  destinationDisplay: Yup.string()
    .min(3, 'Destination display must be at least 3 characters')
    .required(),
  departureStopName: Yup.string()
    .min(3, 'Departure stop name must be at least 3 characters')
    .required(),
  departureDatetime: dateSchema.required(),
  departureFlexibleStop: positionSchema.required('Please place the departure stop on the map.'),
  destinationStopName: Yup.string()
    .min(3, 'Destination stop name must be at least 3 characters')
    .required(),
  destinationDatetime: dateSchema.required(),
  destinationFlexibleStop: positionSchema.required('Please place the destination stop on the map.'),
  driverDeviationBudget: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .nullable()
    .defined()
    .transform((value, original) => (original === '' ? null : value)),
  contactUrl: Yup.string()
    .url('Must be a valid URL')
    .nullable()
    .defined()
    .transform((value, original) => (original === '' ? null : value)),
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
