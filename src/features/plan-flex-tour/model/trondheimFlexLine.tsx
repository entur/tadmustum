import dayjs, { type Dayjs } from 'dayjs';

/**
 * The flex line the form defaults to: `Trondheim_flex`, exported from the NeTEx in
 * `ror/trondheim_flex_netex/`. Every value here is read off that dataset, so a freshly
 * opened form already references a real flexible ServiceJourney that OTP can match.
 *
 * OTP only accepts a booked tour whose `FramedVehicleJourneyRef` names a known
 * `UnscheduledTrip` that runs on the referenced service date; this line qualifies because
 * its `FlexibleLineType` is `flexibleAreasOnly`. Change these defaults when the test data
 * changes — a stale ServiceJourney id is skipped by OTP with a warning and no itinerary.
 */
export const TRONDHEIM_FLEX_LINE = {
  /** Codespace prefix on every id below; also the nunamnir codespace the tour is written to. */
  codespace: 'MAL',
  /** `TimetableFrame/vehicleJourneys/ServiceJourney/@id` — what OTP matches the tour to. */
  serviceJourneyRef: 'MAL:ServiceJourney:0e20a3a3-86b5-4e14-a798-1f0c052a435d',
  /** `ServiceFrame/lines/FlexibleLine/@id`. */
  lineRef: 'MAL:FlexibleLine:5ca5e3c6-00fd-4224-95a5-ab8ff60c072e',
  /** `FlexibleLine/OperatorRef` — the real operator, which is not an `ENT:` id. */
  operatorRef: 'NOG:Operator:9BqxmisyqMG',
  /** `FlexibleLine/Name`, shown in the form so the defaults are recognisable. */
  lineName: 'Trondheim_flex',

  /** `CompositeFrame/validityConditions/AvailabilityCondition`. */
  validFrom: '2026-08-01',
  validTo: '2026-12-31',
  /** `DayType/properties/PropertyOfDay/DaysOfWeek` = Monday–Friday, as dayjs weekdays. */
  operatingWeekdays: [1, 2, 3, 4, 5],

  /**
   * The `TimetabledPassingTime` window on both stops. Insertions must fall inside it — OTP
   * enforces the static NeTEx window regardless of what the tour claims — so the form warns
   * when a tour strays outside.
   */
  earliestDeparture: '08:00',
  latestArrival: '17:00',

  /**
   * Centre of the `FlexibleArea` polygon in `_MAL_flexible_shared_data.xml`, so the map opens
   * over the service area instead of Oslo.
   */
  mapCenter: { longitude: 10.36, latitude: 63.4, zoom: 9 },

  /**
   * A flex bus, not a car. OTP defaults `TotalCapacity` to 5 when the feed omits it, which is
   * car-sized and would make the tour look full after a few bookings.
   */
  totalCapacity: 16,
} as const;

/**
 * The service date the tour defaults to: a week out, matching the carpool trip form, which
 * defaults to departing exactly a week from now. Far enough ahead that the tour is never near
 * nunamnir's expiry validator, and a realistic lead time for a booked tour.
 *
 * Constrained the same way as before: never before the line's validity starts, and always on an
 * operating weekday. A week from now falls on the same weekday as today, so the step-forward loop
 * below is what moves a weekend default onto the following Monday. Returns the validity end when
 * the whole window is already in the past, leaving the form to warn rather than silently picking
 * a dead date.
 */
export function defaultServiceDate(now: Dayjs = dayjs()): Dayjs {
  const validTo = dayjs(TRONDHEIM_FLEX_LINE.validTo);
  let candidate = now.add(1, 'week').startOf('day');
  const validFrom = dayjs(TRONDHEIM_FLEX_LINE.validFrom);
  if (candidate.isBefore(validFrom)) {
    candidate = validFrom;
  }
  // At most a week of stepping is ever needed to land on a Mon–Fri.
  for (let i = 0; i < 7; i++) {
    if (isOperatingDay(candidate)) {
      return candidate;
    }
    candidate = candidate.add(1, 'day');
  }
  return validTo;
}

/** Whether the line runs on the given date: inside the validity window and on a weekday. */
export function isOperatingDay(date: Dayjs): boolean {
  if (!date.isValid()) return false;
  const day = date.startOf('day');
  if (day.isBefore(dayjs(TRONDHEIM_FLEX_LINE.validFrom).startOf('day'))) return false;
  if (day.isAfter(dayjs(TRONDHEIM_FLEX_LINE.validTo).startOf('day'))) return false;
  return (TRONDHEIM_FLEX_LINE.operatingWeekdays as readonly number[]).includes(day.day());
}

/** Whether a time of day falls inside the line's `TimetabledPassingTime` booking window. */
export function isWithinBookingWindow(time: Dayjs): boolean {
  if (!time.isValid()) return false;
  const minutes = time.hour() * 60 + time.minute();
  return (
    minutes >= toMinutes(TRONDHEIM_FLEX_LINE.earliestDeparture) &&
    minutes <= toMinutes(TRONDHEIM_FLEX_LINE.latestArrival)
  );
}

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}
