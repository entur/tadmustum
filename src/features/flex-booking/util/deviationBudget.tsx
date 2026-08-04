import dayjs from 'dayjs';
import type { EstimatedCall } from '../../../shared/model/EstimatedCall.tsx';

/**
 * The dwell the tour was built with, read back off its first call.
 *
 * The dwell is not a field in SIRI — the flex tour form bakes it into every non-last call as
 * `departure = arrival + dwell` — so re-timing a tour after a booking has to recover it, or every
 * dwell silently collapses to zero. Returns 0 when the call carries no arrival (a carpool origin,
 * which only departs) or the times are unusable.
 */
export function tourDwellMinutes(calls: EstimatedCall[]): number {
  const first = calls[0];
  if (!first) return 0;
  const arrival = first.aimedArrivalTime || first.expectedArrivalTime;
  const departure = first.aimedDepartureTime || first.expectedDepartureTime;
  if (!arrival || !departure) return 0;
  const minutes = dayjs(departure).diff(dayjs(arrival), 'minute');
  return minutes > 0 ? minutes : 0;
}

/** A booked stop the insertion would push past the slack it has left. */
export interface SlackViolation {
  /** Index into the previewed calls, so the UI can label it the way the stop list does. */
  index: number;
  stopName: string | undefined;
  /** Minutes past `latestExpectedArrivalTime` the stop would now arrive. */
  overrunMinutes: number;
}

/**
 * The booked stops an insertion would delay past their remaining slack.
 *
 * This is the constraint that actually decides a flex booking: OTP reads each stop's slack as
 * `latestExpectedArrivalTime − expectedArrivalTime` and refuses an insertion that would push any
 * stop past it. Reported rather than blocked — tadmustum is a testing tool, and sending a tour OTP
 * will refuse is a legitimate thing to want to do — so the page warns and still lets you book.
 *
 * Stops with no deadline, and stops whose deadline the tour already broke before this booking, are
 * not reported: the first has nothing to overrun, and the second is not this booking's doing.
 */
export function slackViolations(
  previewCalls: EstimatedCall[],
  originalCalls: EstimatedCall[]
): SlackViolation[] {
  const originalByRef = new Map(
    originalCalls.filter(call => call.stopPointRef).map(call => [call.stopPointRef, call])
  );

  const violations: SlackViolation[] = [];
  previewCalls.forEach((call, index) => {
    const latest = call.latestExpectedArrivalTime;
    const arrival = call.expectedArrivalTime || call.aimedArrivalTime;
    if (!latest || !arrival) return;

    const overrunMinutes = dayjs(arrival).diff(dayjs(latest), 'minute');
    if (overrunMinutes <= 0) return;

    // Already late before this booking touched it — not something to blame on the passenger.
    const original = originalByRef.get(call.stopPointRef);
    if (original) {
      const originalArrival = original.expectedArrivalTime || original.aimedArrivalTime;
      const originalLatest = original.latestExpectedArrivalTime;
      if (
        originalArrival &&
        originalLatest &&
        dayjs(originalArrival).diff(dayjs(originalLatest), 'minute') > 0
      ) {
        return;
      }
    }

    violations.push({ index, stopName: call.stopPointName, overrunMinutes });
  });
  return violations;
}

/** Minutes of slack a stop has left, or null when it carries no deadline. */
export function slackMinutes(call: EstimatedCall): number | null {
  const latest = call.latestExpectedArrivalTime;
  const arrival = call.expectedArrivalTime || call.aimedArrivalTime;
  if (!latest || !arrival) return null;
  return dayjs(latest).diff(dayjs(arrival), 'minute');
}
