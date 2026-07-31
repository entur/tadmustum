import dayjs from 'dayjs';
import type { FlexTourFormData } from '../../features/plan-flex-tour/model/FlexTourFormData.tsx';
import type { Extrajourney } from '../model/Extrajourney.tsx';
import { encodePointAsCircularArea } from '../model/circularAreaCodec.tsx';
import { MINIMUM_BOOKED_STOPS } from '../../features/plan-flex-tour/model/flexTourDataSchema.tsx';

/** SIRI's `DataFrameRef` for a flex tour is the plain service date. */
const SERVICE_DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Builds the `createOrUpdateExtrajourney` variables for a flex booked tour.
 *
 * The payload differs from a carpool trip's in three ways that matter downstream:
 *
 * 1. `framedVehicleJourneyRef` names the existing flexible `ServiceJourney` and its service
 *    date. This is the only thing OTP's flex booking updater matches on — it looks up the
 *    trip, checks that it is an `UnscheduledTrip` and that it runs on that date, and skips
 *    the journey otherwise.
 * 2. `extraJourney` is `false`. The tour is real-time state on a journey that already exists
 *    in the timetable, so claiming otherwise would be wrong; nunamnir accepts `false` only
 *    because the framed ref is present.
 * 3. Every call is an already-booked stop carrying its own remaining slack as
 *    `latestExpectedArrivalTime`. The tour starts at the first stop and ends at the last, so the
 *    only asymmetry is what OTP's mapper insists on: a departure time on the first call and an
 *    arrival time on the last. Both are derived here, not modelled in the form.
 *
 * `estimatedVehicleJourneyCode` is minted as `<serviceJourney>:<serviceDate>` so one vehicle's
 * tour per service date gets one stable identity: nunamnir stores under it, subula keys its
 * cache on it alone, and OTP uses it as the tour's internal trip id while keying the tour
 * itself on the framed ref. Deriving it means re-sending an updated tour for the same journey
 * and date replaces the previous version instead of accumulating duplicates.
 */
function prepareFlexTourData(formData: FlexTourFormData): {
  input: Extrajourney;
} {
  if (formData.bookedStops.length < MINIMUM_BOOKED_STOPS) {
    // The schema requires it; this guard turns a validation bug into a clear failure rather than
    // a journey OTP silently drops for having too few calls.
    throw new Error(
      `Cannot prepare flex tour: at least ${MINIMUM_BOOKED_STOPS} booked stops are required`
    );
  }

  const serviceDate = formData.serviceDate.format(SERVICE_DATE_FORMAT);
  const capacity = formData.totalCapacity ?? undefined;

  const lastIndex = formData.bookedStops.length - 1;

  const bookedCalls = formData.bookedStops.map((stop, index) => {
    if (!stop.position) {
      throw new Error(`Cannot prepare flex tour: booked stop ${index + 1} has no position`);
    }
    const arrival = stop.arrivalDatetime;
    const isFirst = index === 0;
    const isLast = index === lastIndex;
    const departure = arrival.add(formData.dwellMinutes, 'minutes').toISOString();
    return {
      order: index + 1,
      stopPointRef: 'Mandatory for now', // TODO: Discuss to make optional in a Profile
      stopPointName: stop.stopName,
      destinationDisplay: stop.stopName,
      aimedArrivalTime: arrival.toISOString(),
      expectedArrivalTime: arrival.toISOString(),
      // The remaining slack at this stop. OTP reads the budget as the difference to the
      // expected arrival, and refuses any insertion that would push this stop past it.
      latestExpectedArrivalTime: arrival.add(stop.deviationBudget, 'minutes').toISOString(),
      // SIRI needs a departure on every call except the last, and OTP validates call order
      // using it — it also refuses a tour whose first call has no departure at all. The last
      // call is where the tour ends, so it only arrives.
      ...(isLast
        ? { arrivalBoardingActivity: 'alighting' }
        : { aimedDepartureTime: departure, expectedDepartureTime: departure }),
      // The vehicle picks up its first passengers where the tour starts.
      ...(isFirst ? { departureBoardingActivity: 'boarding' } : {}),
      expectedDepartureOccupancy: [{ onboardCount: stop.onboardCount }],
      expectedDepartureCapacities: [{ totalCapacity: capacity }],
      departureStopAssignment: {
        expectedFlexibleArea: {
          circularArea: encodePointAsCircularArea(stop.position),
        },
      },
    };
  });

  return {
    input: {
      estimatedVehicleJourney: {
        recordedAtTime: dayjs().toISOString(),
        lineRef: formData.lineRef,
        directionRef: '0',
        framedVehicleJourneyRef: {
          dataFrameRef: serviceDate,
          datedVehicleJourneyRef: formData.serviceJourneyRef,
        },
        estimatedVehicleJourneyCode: `${formData.serviceJourneyRef}:${serviceDate}`,
        // Not an extra journey: the ServiceJourney this tour belongs to is already in the
        // timetable. nunamnir permits false here only because framedVehicleJourneyRef is set.
        extraJourney: false,
        vehicleMode: 'bus',
        routeRef: '', // TODO: Mandatory in profile. Unused. Check to see if mandatory in schema.
        publishedLineName: `Flex tour ${formData.serviceJourneyRef}`,
        groupOfLinesRef: '', // TODO: Mandatory in SIRI profile. Unused.
        externalLineRef: '',
        operatorRef: formData.operator,
        monitored: true,
        dataSource: formData.dataSource,
        cancellation: formData.tourCancellation,
        isCompleteStopSequence: true,
        estimatedCalls: {
          estimatedCall: bookedCalls,
        },
        publicContact: {
          phoneNumber: null,
          url: null,
        },
      },
    },
  };
}

export default prepareFlexTourData;
