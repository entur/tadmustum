import type { Dayjs } from 'dayjs';

/** SIRI's `DataFrameRef` for a flex tour is the plain service date. */
export const SERVICE_DATE_FORMAT = 'YYYY-MM-DD';

/** Path template of the flex booking page, kept next to the code that builds links to it. */
export const FLEX_BOOKING_ROUTE = '/book-flex/:codespace/:journeyCode';

/**
 * A flex tour's `EstimatedVehicleJourneyCode`: the flexible ServiceJourney plus its service date.
 *
 * One vehicle's tour per service date gets one stable identity — nunamnir stores under it, subula
 * keys its cache on it, and OTP uses it as the tour's internal trip id. Derived rather than
 * generated, so re-sending an updated tour for the same journey and date replaces the previous
 * version instead of accumulating duplicates.
 */
export function flexTourJourneyCode(serviceJourneyRef: string, serviceDate: Dayjs): string {
  return `${serviceJourneyRef}:${serviceDate.format(SERVICE_DATE_FORMAT)}`;
}

/**
 * Where a passenger books a ride on the tour. Sent as SIRI `PublicContact/Url` so it reaches OTP,
 * which reports it as the flex leg's booking URL in place of any static NeTEx one.
 *
 * The journey code is left unescaped, matching the carpool booking links: its colons are legal in
 * a path segment, and a readable link is worth more than a defensively encoded one in a test tool.
 */
export function flexBookingUrl(
  origin: string,
  codespace: string,
  serviceJourneyRef: string,
  serviceDate: Dayjs
): string {
  return `${origin}/book-flex/${codespace}/${flexTourJourneyCode(serviceJourneyRef, serviceDate)}`;
}
