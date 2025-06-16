import type { DepartureStopAssignment } from "./DepartureStopAssignment.tsx";

export interface EstimatedCall {
  stopPointRef: string;
  order: number;
  stopPointName: string;
  destinationDisplay: string;
  aimedArrivalTime?: string;
  expectedArrivalTime?: string;
  aimedDepartureTime?: string;
  expectedDepartureTime?: string;
  arrivalBoardingActivity?: string;
  departureBoardingActivity?: string;
  departureStopAssignment: DepartureStopAssignment;
}
