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
 * A booked tour for one flexible ServiceJourney on one service date: the passenger stops the
 * vehicle has already committed to, in visit order.
 *
 * Every stop is the same kind of thing. The tour starts at the first stop and ends at the last,
 * so neither needs its own field — the only difference is what SIRI is told about them (the
 * first call carries a departure, the last an arrival), which is derived when the payload is
 * built rather than modelled here.
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

  /**
   * How long the vehicle stands at each booked stop. Used to derive each stop's departure time
   * from its arrival time, which SIRI needs on every call except the last.
   */
  dwellMinutes: number;

  /**
   * Where a passenger books a ride on this tour: tadmustum's own flex booking page. Sent as SIRI
   * {@code PublicContact/Url}, which OTP surfaces as the leg's booking URL — overriding whatever
   * the flexible line's static NeTEx BookingArrangements says, since a booked tour's link is the
   * live one. Defaulted by the form from the data source and the journey code; editable, and
   * nulled out by clearing the field.
   */
  contactUrl?: string | null;

  /**
   * Whether every stop after the first has its arrival time driven by the routed driving time
   * rather than typed in. The first stop's arrival is the tour's anchor and is always the user's
   * to set. UI-only, like the carpool form's flag of the same name: it shapes what is typed into
   * the stops, never the payload, so it is deliberately absent from the schema.
   */
  estimateArrivalAutomatically?: boolean;

  bookedStops: FlexTourBookedStop[];
};
