import type { CarPoolingTripDataFormData } from '../../features/plan-trip/model/CarPoolingTripDataFormData.tsx';
import type { Extrajourney } from '../model/Extrajourney.tsx';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { encodePointAsCircularArea } from '../model/circularAreaCodec.tsx';

function prepareCarpoolingFormData(formData: CarPoolingTripDataFormData): {
  codespace: string;
  authority: string;
  input: Extrajourney;
} {
  if (!formData.departureFlexibleStop || !formData.destinationFlexibleStop) {
    // Form validation prevents submit without both stops; this guard narrows
    // the types and turns any validation bug into a clear failure instead of
    // an unrelated null deref further down.
    throw new Error('Cannot prepare carpooling form: departure and destination stops are required');
  }
  const intermediateCalls = formData.intermediateCalls.map((call, index) => ({
    ...call,
    order: index + 2,
  }));
  const destinationOrder = intermediateCalls.length + 2;
  const variables = {
    codespace: formData.codespace,
    authority: formData.authority,
    input: {
      estimatedVehicleJourney: {
        recordedAtTime: dayjs().toISOString(),
        lineRef: formData.lineRef ?? `${formData.codespace}:CarPooling:${uuidv4()}`,
        directionRef: '0',
        estimatedVehicleJourneyCode: formData.estimatedVehicleJourneyCode ?? '',
        extraJourney: true,
        vehicleMode: 'bus', // TODO: Needs to add car as vehicle mode
        routeRef: '', // TODO: Mandatory in profile. Unused. Check to see if mandatory in schema.
        publishedLineName: `Carpooling trip ${formData.authority}`,
        groupOfLinesRef: '', // TODO: Mandatory in SIRI profile. Unused. Check to see if mandatory in schema.
        externalLineRef: '', // TODO: Reference back to original line which usually a evj is an replacement for... Check to see if mandatory in schema
        operatorRef: formData.operator,
        monitored: true,
        dataSource: 'ENT', // TODO: Remove hard coding
        cancellation: formData.tripCancellation,
        isCompleteStopSequence: true,
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointRef: 'Mandatory for now', // TODO: Discuss to make optional in a Profile
              stopPointName: formData.departureStopName,
              cancellation: formData.departureCancellation,
              destinationDisplay: formData.departureDestinationDisplay,
              aimedDepartureTime: formData.departureDatetime.toISOString(),
              expectedDepartureTime: formData.departureDatetime.toISOString(),
              departureBoardingActivity: 'boarding',
              expectedDepartureOccupancy: [
                {
                  onboardCount: formData.onboardCount ?? undefined,
                },
              ],
              expectedDepartureCapacities: [
                {
                  totalCapacity: formData.totalCapacity ?? undefined,
                },
              ],
              departureStopAssignment: {
                expectedFlexibleArea: {
                  circularArea: encodePointAsCircularArea(formData.departureFlexibleStop),
                },
              },
            },
            ...intermediateCalls,
            {
              order: destinationOrder,
              stopPointRef: 'Mandatory for now', // TODO: Discuss to make optional in a Profile
              stopPointName: formData.destinationStopName,
              cancellation: formData.destinationCancellation,
              destinationDisplay: formData.destinationDestinationDisplay,
              aimedArrivalTime: formData.destinationDatetime.toISOString(),
              expectedArrivalTime: formData.destinationDatetime.toISOString(),
              latestExpectedArrivalTime: formData.destinationDatetime
                .add(formData.driverDeviationBudget, 'minutes')
                .toISOString(),
              arrivalBoardingActivity: 'alighting',
              expectedDepartureOccupancy: [
                {
                  onboardCount: formData.onboardCount ?? undefined,
                },
              ],
              expectedDepartureCapacities: [
                {
                  totalCapacity: formData.totalCapacity ?? undefined,
                },
              ],
              departureStopAssignment: {
                expectedFlexibleArea: {
                  circularArea: encodePointAsCircularArea(formData.destinationFlexibleStop),
                },
              },
            },
          ],
        },
        expiresAtEpochMs: formData.destinationDatetime.add(7, 'day').valueOf(),
        publicContact: {
          phoneNumber: null,
          url: formData.contactUrl,
        },
      },
    },
  };

  if (formData.id) {
    return {
      codespace: variables.codespace,
      authority: variables.authority,
      input: {
        id: formData.id,
        ...variables.input,
      },
    };
  } else {
    return variables;
  }
}

export default prepareCarpoolingFormData;
