import dayjs, { Dayjs } from 'dayjs';
import * as Yup from 'yup';
import type { Position } from 'geojson';

/**
 * Must match nunamnir's expiry grace (and subula's and OTP's): a tour whose last call is
 * further in the past than this expires the moment it is written and never reaches OTP, so
 * there is no point creating it.
 */
export const TOUR_EXPIRY_DAYS = 2;

/**
 * Must match OTP's `FlexBookingSiriMapper.MAX_TOUR_DURATION`. Unlike a carpool trip, a flex
 * vehicle's tour may legitimately span a service day, so the bound is a full 24 hours — but
 * OTP rejects the tour outright beyond it.
 */
export const MAX_TOUR_DURATION_HOURS = 24;

/** OTP needs the anchor plus at least one booked stop; fewer means "no commitments to protect". */
export const MINIMUM_BOOKED_STOPS = 1;

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

const bookedStopSchema = Yup.object({
  featureId: Yup.string().nullable().defined(),
  position: positionSchema.required('Place this stop on the map.'),
  stopName: Yup.string().min(1, 'Stop name is required').required(),
  arrivalDatetime: dateSchema.required(),
  deviationBudget: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .required(),
  onboardCount: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .required(),
});

export const flexTourDataSchema = Yup.object({
  dataSource: Yup.string().required('Data source is required'),
  // Deliberately not restricted to `ENT:` the way the carpool schema is: a flex tour belongs to
  // a real flexible line whose NeTEx operator is its own (Trondheim_flex is `NOG:Operator:…`).
  operator: Yup.string().required('Operator is required'),
  serviceJourneyRef: Yup.string()
    .required('ServiceJourney reference is required')
    .matches(
      /^[A-Za-z0-9]+:ServiceJourney:.+$/,
      'Must look like <CODESPACE>:ServiceJourney:<id> — this is what OTP matches the tour to'
    ),
  serviceDate: dateSchema
    .required('Service date is required')
    // A tour more than the grace period in the past is discarded server-side before it can
    // reach OTP, so block it here rather than reporting a false success.
    .test(
      'not-expired',
      `Service date is more than ${TOUR_EXPIRY_DAYS} days in the past — the tour would expire immediately and never reach the journey planner (OTP).`,
      value =>
        !value ||
        !(value as Dayjs).isValid() ||
        (value as Dayjs).valueOf() >=
          dayjs().subtract(TOUR_EXPIRY_DAYS, 'day').startOf('day').valueOf()
    ),
  lineRef: Yup.string().required('Line reference is required'),
  totalCapacity: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(1, 'Must be at least 1')
    .nullable()
    .defined()
    .transform((value, original) => (original === '' ? null : value)),
  tourCancellation: Yup.boolean().required(),

  anchorFeatureId: Yup.string().nullable().defined(),
  anchorPosition: positionSchema.required("Place the vehicle's current position on the map."),
  anchorStopName: Yup.string().min(1, 'Stop name is required').required(),
  anchorDepartureDatetime: dateSchema.required('Tour start time is required'),

  dwellMinutes: Yup.number()
    .typeError('Must be a number')
    .integer('Must be an integer')
    .min(0, 'Must be zero or a positive integer')
    .required(),

  bookedStops: Yup.array()
    .of(bookedStopSchema)
    .min(
      MINIMUM_BOOKED_STOPS,
      'A tour needs at least one booked stop — with fewer than two calls OTP removes the tour and falls back to the static flex behaviour.'
    )
    .required()
    // The calls are sent in list order and OTP rejects a journey whose calls are out of order,
    // so catch it here where the user can see which stop is wrong.
    .test(
      'stops-in-order',
      'Booked stops must be in increasing time order — the vehicle visits them in the order listed.',
      stops => {
        if (!stops) return true;
        for (let i = 1; i < stops.length; i++) {
          const previous = stops[i - 1]?.arrivalDatetime as Dayjs | undefined;
          const current = stops[i]?.arrivalDatetime as Dayjs | undefined;
          if (!previous?.isValid?.() || !current?.isValid?.()) continue;
          if (!current.isAfter(previous)) return false;
        }
        return true;
      }
    ),
});

/**
 * The tour's span as OTP measures it: from the anchor's departure to the last stop's *latest*
 * expected arrival, which is its expected arrival plus its remaining deviation budget. Returns
 * null while either end is missing or invalid.
 *
 * Kept out of the schema deliberately. OTP rejects a tour that ends before it starts or spans
 * more than {@link MAX_TOUR_DURATION_HOURS}, but tadmustum is a testing tool and sending such a
 * tour on purpose is legitimate — the form warns instead of blocking (see the workspace note on
 * preferring warnings over hard validation here).
 */
export function tourSpanHours(
  anchorDeparture: Dayjs | undefined,
  bookedStops: { arrivalDatetime?: Dayjs; deviationBudget?: number }[] | undefined
): number | null {
  const stops = bookedStops ?? [];
  const last = stops[stops.length - 1];
  const lastArrival = last?.arrivalDatetime;
  if (!anchorDeparture?.isValid?.() || !lastArrival?.isValid?.()) return null;
  const latestArrival = lastArrival.add(last?.deviationBudget ?? 0, 'minute');
  return latestArrival.diff(anchorDeparture, 'hour', true);
}
