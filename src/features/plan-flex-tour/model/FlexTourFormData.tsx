import type { Dayjs } from 'dayjs';
import type { Position } from 'geojson';

/**
 * One already-booked passenger stop on the vehicle's tour. These are the commitments an
 * inserted passenger must not break: OTP reads each stop's remaining slack from
 * `LatestExpectedArrivalTime − ExpectedArrivalTime` and refuses an insertion that would push
 * any stop past it.
 */
export type FlexTourBookedStop = {
  /** Id of the drawn map feature, so the row can zoom to or remove its own stop. */
  featureId: string | null;
  position: Position | null;
  stopName: string;
  /** Absolute time the vehicle is expected to reach this stop. */
  arrivalDatetime: Dayjs;
  /** Remaining slack at this stop in minutes; emitted as arrival + this. */
  deviationBudget: number;
  /** Passengers on board (including the driver) when the vehicle leaves this stop. */
  onboardCount: number;
};

/**
 * A booked tour for one flexible ServiceJourney on one service date: where the vehicle is now
 * (the anchor) followed by the passenger stops it has already committed to, in visit order.
 */
export type FlexTourFormData = {
  /**
   * The codespace the tour is written under — the journey's SIRI `DataSource`, which nunamnir
   * authorizes the write on. Must prefix the lineRef, the ServiceJourney ref and the journey
   * code, or nunamnir rejects the payload.
   */
  dataSource: string;
  operator: string;
  /** Existing NeTEx ServiceJourney the tour belongs to; sent as DatedVehicleJourneyRef. */
  serviceJourneyRef: string;
  /** Service date of that journey; sent as DataFrameRef (yyyy-MM-dd). */
  serviceDate: Dayjs;
  lineRef: string;
  totalCapacity: number | null;
  /** Cancels the whole tour, which makes OTP drop it and fall back to static flex behaviour. */
  tourCancellation: boolean;

  /** The vehicle's current position / tour start. Its deviation budget is always zero. */
  anchorFeatureId: string | null;
  anchorPosition: Position | null;
  anchorStopName: string;
  anchorDepartureDatetime: Dayjs;

  /**
   * How long the vehicle stands at each booked stop. Used to derive each stop's departure time
   * from its arrival time, which SIRI needs on every call except the last.
   */
  dwellMinutes: number;

  bookedStops: FlexTourBookedStop[];
};
