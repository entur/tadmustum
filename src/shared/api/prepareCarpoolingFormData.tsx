import type { CarPoolingTripDataFormData } from "../../features/plan-trip/model/CarPoolingTripDataFormData.tsx";
import type { Extrajourney } from "../model/Extrajourney.tsx";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

function prepareCarpoolingFormData(formData: CarPoolingTripDataFormData): {
  codespace: string;
  authority: string;
  input: Extrajourney;
} {
  const variables = {
    codespace: formData.codespace,
    authority: formData.authority,
    input: {
      estimatedVehicleJourney: {
        recordedAtTime: dayjs().toISOString(), //TODO: Generate iso time stamp
        lineRef: `ENT:CarPooling:${uuidv4()}`, // TODO: Generate CodeSpaced "ENT:Line:<uuid>" UUID reference
        directionRef: "0",
        estimatedVehicleJourneyCode: "", // TODO: Generate "<codespace>:ServiceJourney:<uuid>".
        extraJourney: true,
        vehicleMode: "bus", // TODO: Needs to add car as vehicle mode
        routeRef: "", // TODO: Mandatory in profile. Unused. Check to see if mandatory in schema.
        publishedLineName: formData.lineName,
        groupOfLinesRef: "", // TODO: Mandatory in SIRI profile. Unused. Check to see if mandatory in schema.
        externalLineRef: "", // TODO: Reference back to original line which usually a evj is an replacement for... Check to see if mandatory in schema
        operatorRef: formData.operator,
        monitored: true,
        dataSource: "ENT", // TODO: Remove hard coding
        cancellation: false,
        isCompleteStopSequence: true,
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointRef: "Mandatory for now", // TODO: Discuss to make optional in a Profile
              stopPointName: formData.departureStopName,
              destinationDisplay: formData.destinationDisplay,
              aimedDepartureTime: formData.departureDatetime.toISOString(),
              expectedDepartureTime: formData.departureDatetime.toISOString(),
              departureBoardingActivity: "boarding",
              departureStopAssignment: {
                expectedFlexibleArea: {
                  polygon: {
                    exterior: {
                      posList: formData.departureFlexibleStop,
                    },
                  },
                },
              },
            },
            {
              order: 2,
              stopPointRef: "Mandatory for now", // TODO: Discuss to make optional in a Profile
              stopPointName: formData.destinationStopName,
              destinationDisplay: formData.destinationDisplay,
              aimedArrivalTime: formData.destinationDatetime.toISOString(),
              expectedArrivalTime: formData.destinationDatetime.toISOString(),
              arrivalBoardingActivity: "alighting",
              departureStopAssignment: {
                expectedFlexibleArea: {
                  polygon: {
                    exterior: {
                      posList: formData.destinationFlexibleStop,
                    },
                  },
                },
              },
            },
          ],
        },
        expiresAtEpochMs: formData.destinationDatetime.add(1, "hour").valueOf(),
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
