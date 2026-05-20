import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData.tsx';
import dayjs from 'dayjs';
import loadFeatureFromFlexArea from './loadFeatureFromFlexArea.tsx';
import type { ExpectedFlexibleArea } from '../../../shared/model/ExpectedFlexibleArea.tsx';
import type { Position } from 'geojson';

const flexAreaToPosition = (flexArea: ExpectedFlexibleArea | undefined): Position | null => {
  const feature = loadFeatureFromFlexArea(flexArea);
  return feature ? feature.geometry.coordinates : null;
};

const mapToFormData = (journey: Extrajourney): CarPoolingTripDataFormData => {
  const calls = journey.estimatedVehicleJourney.estimatedCalls.estimatedCall;
  const firstCall = calls[0];
  const lastCall = calls[calls.length - 1];

  return {
    codespace: 'ENT',
    authority: 'ENT:Authority:ENT',
    operator: journey.estimatedVehicleJourney.operatorRef,
    id: journey.id,
    lineRef: journey.estimatedVehicleJourney.lineRef,
    estimatedVehicleJourneyCode: journey.estimatedVehicleJourney.estimatedVehicleJourneyCode,
    departureDestinationDisplay: firstCall.destinationDisplay,
    destinationDestinationDisplay: lastCall.destinationDisplay,
    departureStopName: firstCall.stopPointName,
    departureDatetime: dayjs(firstCall.aimedDepartureTime),
    departureFlexibleStop: flexAreaToPosition(
      firstCall.departureStopAssignment?.expectedFlexibleArea
    ),
    destinationStopName: lastCall.stopPointName,
    destinationDatetime: dayjs(lastCall.aimedArrivalTime),
    // SIRI-ET handbook: "either the ArrivalStopAssignment or
    // DepartureStopAssignment, are defined, but never both" — we read
    // departureStopAssignment for every call, including the last.
    // https://entur.atlassian.net/wiki/spaces/PUBLIC/pages/637370392/SIRI-ET#EstimatedCall
    destinationFlexibleStop: flexAreaToPosition(
      lastCall.departureStopAssignment?.expectedFlexibleArea
    ),
    driverDeviationBudget:
      lastCall.latestExpectedArrivalTime && lastCall.aimedArrivalTime
        ? dayjs(lastCall.latestExpectedArrivalTime).diff(
            dayjs(lastCall.aimedArrivalTime),
            'minutes'
          )
        : null,
    contactUrl: journey.estimatedVehicleJourney.publicContact?.url ?? null,
    totalCapacity: firstCall.expectedDepartureCapacities?.[0]?.totalCapacity ?? null,
    onboardCount: firstCall.expectedDepartureOccupancy?.[0]?.onboardCount ?? null,
  };
};

export default mapToFormData;
