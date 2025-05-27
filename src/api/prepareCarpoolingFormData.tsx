import type { CarPoolingTripDataFormData } from "../pages/CarPoolingTripDataForm.tsx";

interface EstimatedVehicleJourneyInput {
  recordedAtTime: string;
  lineRef: string;
  directionRef: string;
  estimatedVehicleJourneyCode: string;
  extraJourney: boolean;
  vehicleMode: string;
  routeRef: string;
  publishedLineName: string;
  groupOfLinesRef: string;
  externalLineRef: string;
  operatorRef: string;
  monitored: boolean;
  dataSource: string;
  estimatedCalls: EstimatedCallsInput;
}

interface EstimatedCallsInput {
  estimatedCall: EstimatedCallInput[];
}

interface EstimatedCallInput {
  stopPointRef?: string;
  order: number;
  stopPointName: string;
  cancellation?: boolean;
  requestStop?: boolean;
  destinationDisplay: string;
  aimedArrivalTime?: string;
  expectedArrivalTime?: string;
  aimedDepartureTime?: string;
  expectedDepartureTime?: string;
  arrivalStatus?: string;
  arrivalBoardingActivity?: string;
  departureStatus?: string;
  departureBoardingActivity?: string;
  departureStopAssignment?: DepartureStopAssignmentInput;
}

interface DepartureStopAssignmentInput {
  expectedFlexibleArea: ExpectedFlexibleAreaInput;
}

interface ExpectedFlexibleAreaInput {
  polygon: PolygonInput;
}

interface PolygonInput {
  exterior: LinearRingInput;
}

interface LinearRingInput {
  posList: string;
}

function prepareCarpoolingFormData(formData: CarPoolingTripDataFormData): {
  codespace: string;
  authority: string;
  input: { estimatedVehicleJourney: EstimatedVehicleJourneyInput };
} {
  return {
    codespace: formData.codespace, // TODO: Remove hard coding
    authority: formData.authority,
    input: {
      estimatedVehicleJourney: {
        recordedAtTime: "", //TODO: Generate iso time stamp
        lineRef: "", // TODO: Generate CodeSpaced "ENT:LINE" UUID reference
        directionRef: "0",
        estimatedVehicleJourneyCode: "", // TODO: ...
        extraJourney: true,
        vehicleMode: "car",
        routeRef: "", // TODO: ...
        publishedLineName: formData.lineName,
        groupOfLinesRef: "",
        externalLineRef: "",
        operatorRef: formData.operator, // TODO: Pick operator
        monitored: true,
        dataSource: "ENT", // TODO: Remove hard coding
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
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
      },
    },
  };
}

export default prepareCarpoolingFormData;
