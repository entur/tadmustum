import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import prepareFlexTourData from './prepareFlexTourData';
import type {
  FlexTourBookedStop,
  FlexTourFormData,
} from '../../features/plan-flex-tour/model/FlexTourFormData';

const SERVICE_JOURNEY = 'MAL:ServiceJourney:0e20a3a3-86b5-4e14-a798-1f0c052a435d';

const bookedStop = (overrides: Partial<FlexTourBookedStop> = {}): FlexTourBookedStop => ({
  featureId: 'feature-1',
  position: [10.4, 63.42],
  stopName: 'Pickup',
  arrivalDatetime: dayjs('2026-08-03T09:10:00.000Z'),
  deviationBudget: 15,
  onboardCount: 2,
  ...overrides,
});

const baseForm = (overrides: Partial<FlexTourFormData> = {}): FlexTourFormData => ({
  dataSource: 'MAL',
  operator: 'NOG:Operator:9BqxmisyqMG',
  serviceJourneyRef: SERVICE_JOURNEY,
  serviceDate: dayjs('2026-08-03T00:00:00.000Z'),
  lineRef: 'MAL:FlexibleLine:5ca5e3c6-00fd-4224-95a5-ab8ff60c072e',
  totalCapacity: 16,
  tourCancellation: false,
  dwellMinutes: 1,
  bookedStops: [
    bookedStop(),
    bookedStop({
      featureId: 'feature-2',
      position: [10.32, 63.39],
      stopName: 'Dropoff',
      arrivalDatetime: dayjs('2026-08-03T09:45:00.000Z'),
      deviationBudget: 10,
      onboardCount: 1,
    }),
  ],
  ...overrides,
});

const callsOf = (form: FlexTourFormData) =>
  prepareFlexTourData(form).input.estimatedVehicleJourney.estimatedCalls!.estimatedCall;

describe('prepareFlexTourData', () => {
  it('references the existing ServiceJourney and service date', () => {
    const journey = prepareFlexTourData(baseForm()).input.estimatedVehicleJourney;

    expect(journey.framedVehicleJourneyRef).toEqual({
      dataFrameRef: '2026-08-03',
      datedVehicleJourneyRef: SERVICE_JOURNEY,
    });
  });

  it('is not an extra journey — the ServiceJourney already exists in the timetable', () => {
    const journey = prepareFlexTourData(baseForm()).input.estimatedVehicleJourney;

    expect(journey.extraJourney).toBe(false);
  });

  it('derives one stable journey code per ServiceJourney and service date', () => {
    const journey = prepareFlexTourData(baseForm()).input.estimatedVehicleJourney;

    // subula keys its cache on this alone, so it must differ per service date.
    expect(journey.estimatedVehicleJourneyCode).toBe(`${SERVICE_JOURNEY}:2026-08-03`);

    const otherDate = prepareFlexTourData(
      baseForm({ serviceDate: dayjs('2026-08-04T00:00:00.000Z') })
    ).input.estimatedVehicleJourney;
    expect(otherDate.estimatedVehicleJourneyCode).not.toBe(journey.estimatedVehicleJourneyCode);
  });

  it('sends the form dataSource verbatim, never deriving it from a reference', () => {
    const result = prepareFlexTourData(baseForm({ dataSource: 'ent' }));

    expect(result.input.estimatedVehicleJourney.dataSource).toBe('ent');
  });

  it('emits one call per booked stop, in visit order', () => {
    const calls = callsOf(baseForm());

    expect(calls).toHaveLength(2);
    expect(calls.map(c => c.order)).toEqual([1, 2]);
    expect(calls.map(c => c.stopPointName)).toEqual(['Pickup', 'Dropoff']);
  });

  // OTP refuses a tour whose first call has no departure time at all, so the first stop is sent
  // one derived from its dwell — it is otherwise an ordinary booked stop with its own budget.
  it('gives the first call a departure and marks it as boarding', () => {
    const [first] = callsOf(baseForm());

    expect(first.aimedDepartureTime).toBe('2026-08-03T09:11:00.000Z');
    expect(first.expectedDepartureTime).toBe('2026-08-03T09:11:00.000Z');
    expect(first.departureBoardingActivity).toBe('boarding');
    expect(first.aimedArrivalTime).toBe('2026-08-03T09:10:00.000Z');
    expect(first.latestExpectedArrivalTime).toBe('2026-08-03T09:25:00.000Z');
  });

  it('encodes each deviation budget as latestExpectedArrivalTime', () => {
    const [pickup, dropoff] = callsOf(baseForm());

    // OTP reads the budget back as latestExpectedArrivalTime − expectedArrivalTime.
    expect(pickup.expectedArrivalTime).toBe('2026-08-03T09:10:00.000Z');
    expect(pickup.latestExpectedArrivalTime).toBe('2026-08-03T09:25:00.000Z');
    expect(dropoff.expectedArrivalTime).toBe('2026-08-03T09:45:00.000Z');
    expect(dropoff.latestExpectedArrivalTime).toBe('2026-08-03T09:55:00.000Z');
  });

  it('derives departure times from the dwell time', () => {
    const [pickup] = callsOf(baseForm({ dwellMinutes: 3 }));

    expect(pickup.aimedDepartureTime).toBe('2026-08-03T09:13:00.000Z');
    expect(pickup.expectedDepartureTime).toBe('2026-08-03T09:13:00.000Z');
  });

  it('leaves the last call arrival-only — it is the end of the tour', () => {
    const calls = callsOf(baseForm());
    const last = calls[calls.length - 1];

    expect(last.aimedDepartureTime).toBeUndefined();
    expect(last.expectedDepartureTime).toBeUndefined();
    expect(last.arrivalBoardingActivity).toBe('alighting');
    // Only the first call boards; the rest carry no boarding activity of their own.
    expect(last.departureBoardingActivity).toBeUndefined();
  });

  it('encodes stop positions as a CircularArea with the sentinel radius', () => {
    const [pickup, dropoff] = callsOf(baseForm());

    expect(pickup.departureStopAssignment?.expectedFlexibleArea?.circularArea).toEqual({
      longitude: 10.4,
      latitude: 63.42,
      radius: 1,
    });
    expect(dropoff.departureStopAssignment?.expectedFlexibleArea?.circularArea).toEqual({
      longitude: 10.32,
      latitude: 63.39,
      radius: 1,
    });
  });

  it('sends capacity and onboard counts on every booked stop', () => {
    const [pickup, dropoff] = callsOf(baseForm());

    expect(pickup.expectedDepartureCapacities).toEqual([{ totalCapacity: 16 }]);
    expect(pickup.expectedDepartureOccupancy).toEqual([{ onboardCount: 2 }]);
    expect(dropoff.expectedDepartureOccupancy).toEqual([{ onboardCount: 1 }]);
  });

  it('omits capacity rather than sending null when it is unset', () => {
    const [pickup] = callsOf(baseForm({ totalCapacity: null }));

    expect(pickup.expectedDepartureCapacities).toEqual([{ totalCapacity: undefined }]);
  });

  it('carries the cancellation flag onto the journey', () => {
    const journey = prepareFlexTourData(baseForm({ tourCancellation: true })).input
      .estimatedVehicleJourney;

    expect(journey.cancellation).toBe(true);
  });

  it('is modelled as a bus, which nunamnir requires', () => {
    const journey = prepareFlexTourData(baseForm()).input.estimatedVehicleJourney;

    expect(journey.vehicleMode).toBe('bus');
  });

  it('throws when there are no booked stops', () => {
    expect(() => prepareFlexTourData(baseForm({ bookedStops: [] }))).toThrow(
      /at least 2 booked stops/
    );
  });

  // A single call is not a tour: OTP drops it and falls back to the static flex behaviour, so
  // building the payload at all would report a false success.
  it('throws when there is only one booked stop', () => {
    expect(() => prepareFlexTourData(baseForm({ bookedStops: [bookedStop()] }))).toThrow(
      /at least 2 booked stops/
    );
  });

  it('throws when a booked stop was never placed on the map', () => {
    expect(() =>
      prepareFlexTourData(baseForm({ bookedStops: [bookedStop({ position: null }), bookedStop()] }))
    ).toThrow(/booked stop 1 has no position/);
  });
});
