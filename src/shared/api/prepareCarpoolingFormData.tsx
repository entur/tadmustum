import type { CarPoolingTripDataFormData } from '../../features/plan-trip/model/CarPoolingTripDataFormData.tsx';
import type { Extrajourney } from '../model/Extrajourney.tsx';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { encodePointAsCircularArea } from '../model/circularAreaCodec.tsx';
import { ENTUR_OPERATOR_ID } from '../model/enturOperator.tsx';

function prepareCarpoolingFormData(formData: CarPoolingTripDataFormData): {
  input: Extrajourney;
} {
  if (!formData.departureFlexibleStop || !formData.destinationFlexibleStop) {
    // Form validation prevents submit without both stops; this guard narrows
    // the types and turns any validation bug into a clear failure instead of
    // an unrelated null deref further down.
    throw new Error('Cannot prepare carpooling form: departure and destination stops are required');
  }
  // The form's dataSource IS the codespace: it is minted into the journey's ids
  // and carried as the SIRI DataSource, which nunamnir authorizes the write on
  // and pins the other references to.
  const codespace = formData.dataSource;
  const intermediateCalls = formData.intermediateCalls.map((call, index) => ({
    ...call,
    order: index + 2,
  }));
  const destinationOrder = intermediateCalls.length + 2;
  const variables = {
    input: {
      estimatedVehicleJourney: {
        recordedAtTime: dayjs().toISOString(),
        lineRef: formData.lineRef ?? `${codespace}:CarPooling:${uuidv4()}`,
        directionRef: '0',
        // The estimatedVehicleJourneyCode is the single key identifying this trip across
        // every system (nunamnir's storage doc id, subula's lookup key, OTP's trip id).
        // Generate it once on create and round-trip it on edit (see mapToFormData) so the
        // trip keeps one stable identity end-to-end.
        estimatedVehicleJourneyCode:
          formData.estimatedVehicleJourneyCode ?? `${codespace}:ServiceJourney:${uuidv4()}`,
        extraJourney: true,
        vehicleMode: 'bus', // TODO: Needs to add car as vehicle mode
        routeRef: '', // TODO: Mandatory in profile. Unused. Check to see if mandatory in schema.
        publishedLineName: `Carpooling trip ${codespace}`,
        groupOfLinesRef: '', // TODO: Mandatory in SIRI profile. Unused. Check to see if mandatory in schema.
        externalLineRef: '', // TODO: Reference back to original line which usually a evj is an replacement for... Check to see if mandatory in schema
        // Hardcoded, never taken from the form or an API: only Entur publishes
        // carpool trips and nothing downstream reads the value (see
        // ENTUR_OPERATOR_ID).
        operatorRef: ENTUR_OPERATOR_ID,
        monitored: true,
        dataSource: codespace,
        cancellation: formData.tripCancellation,
        isCompleteStopSequence: true,
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointRef: 'Mandatory for now', // TODO: Discuss to make optional in a Profile
              stopPointName: formData.departureStopName,
              cancellation: formData.departureCancellation,
              destinationDisplay: formData.departureStopName,
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
              destinationDisplay: formData.destinationStopName,
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
        publicContact: {
          phoneNumber: null,
          url: formData.contactUrl,
        },
      },
    },
  };

  if (formData.id) {
    return {
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
