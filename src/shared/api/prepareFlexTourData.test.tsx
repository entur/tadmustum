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
  anchorFeatureId: 'anchor-feature',
  anchorPosition: [10.3951, 63.4305],
  anchorStopName: 'Vehicle position',
  anchorDepartureDatetime: dayjs('2026-08-03T09:00:00.000Z'),
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

  it('puts the vehicle anchor first, then the booked stops in visit order', () => {
    const calls = callsOf(baseForm());

    expect(calls).toHaveLength(3);
    expect(calls.map(c => c.order)).toEqual([1, 2, 3]);
    expect(calls.map(c => c.stopPointName)).toEqual(['Vehicle position', 'Pickup', 'Dropoff']);
  });

  it('gives the anchor a departure time and no arrival commitment', () => {
    const [anchor] = callsOf(baseForm());

    expect(anchor.aimedDepartureTime).toBe('2026-08-03T09:00:00.000Z');
    expect(anchor.expectedDepartureTime).toBe('2026-08-03T09:00:00.000Z');
    // OTP forces the anchor's deviation budget to zero, so a latest arrival is meaningless.
    expect(anchor.latestExpectedArrivalTime).toBeUndefined();
    expect(anchor.aimedArrivalTime).toBeUndefined();
  });

  it('encodes each deviation budget as latestExpectedArrivalTime', () => {
    const [, pickup, dropoff] = callsOf(baseForm());

    // OTP reads the budget back as latestExpectedArrivalTime − expectedArrivalTime.
    expect(pickup.expectedArrivalTime).toBe('2026-08-03T09:10:00.000Z');
    expect(pickup.latestExpectedArrivalTime).toBe('2026-08-03T09:25:00.000Z');
    expect(dropoff.expectedArrivalTime).toBe('2026-08-03T09:45:00.000Z');
    expect(dropoff.latestExpectedArrivalTime).toBe('2026-08-03T09:55:00.000Z');
  });

  it('derives intermediate departure times from the dwell time', () => {
    const [, pickup] = callsOf(baseForm({ dwellMinutes: 3 }));

    expect(pickup.aimedDepartureTime).toBe('2026-08-03T09:13:00.000Z');
    expect(pickup.expectedDepartureTime).toBe('2026-08-03T09:13:00.000Z');
  });

  it('leaves the last call arrival-only — it is the end of the tour', () => {
    const calls = callsOf(baseForm());
    const last = calls[calls.length - 1];

    expect(last.aimedDepartureTime).toBeUndefined();
    expect(last.expectedDepartureTime).toBeUndefined();
    expect(last.arrivalBoardingActivity).toBe('alighting');
  });

  it('encodes stop positions as a CircularArea with the sentinel radius', () => {
    const [anchor, pickup] = callsOf(baseForm());

    expect(anchor.departureStopAssignment?.expectedFlexibleArea?.circularArea).toEqual({
      longitude: 10.3951,
      latitude: 63.4305,
      radius: 1,
    });
    expect(pickup.departureStopAssignment?.expectedFlexibleArea?.circularArea).toEqual({
      longitude: 10.4,
      latitude: 63.42,
      radius: 1,
    });
  });

  it('sends capacity and onboard counts on every booked stop', () => {
    const [, pickup, dropoff] = callsOf(baseForm());

    expect(pickup.expectedDepartureCapacities).toEqual([{ totalCapacity: 16 }]);
    expect(pickup.expectedDepartureOccupancy).toEqual([{ onboardCount: 2 }]);
    expect(dropoff.expectedDepartureOccupancy).toEqual([{ onboardCount: 1 }]);
  });

  it('omits capacity rather than sending null when it is unset', () => {
    const [, pickup] = callsOf(baseForm({ totalCapacity: null }));

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

  it('throws when the vehicle has no position', () => {
    expect(() => prepareFlexTourData(baseForm({ anchorPosition: null }))).toThrow(
      /position is required/
    );
  });

  it('throws when there are no booked stops', () => {
    expect(() => prepareFlexTourData(baseForm({ bookedStops: [] }))).toThrow(
      /at least one booked stop/
    );
  });

  it('throws when a booked stop was never placed on the map', () => {
    expect(() =>
      prepareFlexTourData(baseForm({ bookedStops: [bookedStop({ position: null })] }))
    ).toThrow(/booked stop 1 has no position/);
  });
});
