/**
 * Reference to an existing NeTEx `ServiceJourney` on a specific service date.
 *
 * Present on flex booked tours and absent on carpool trips, and that difference is what
 * distinguishes the two all the way down the pipeline: nunamnir keys its `extraJourney`
 * rule on it, and OTP's flex booking updater matches a tour to its static `UnscheduledTrip`
 * through this reference alone.
 */
export interface FramedVehicleJourneyRef {
  /** Service date of the referenced journey, `yyyy-MM-dd`. */
  dataFrameRef: string;
  /** Id of the referenced `ServiceJourney`, without any feed prefix. */
  datedVehicleJourneyRef: string;
}
