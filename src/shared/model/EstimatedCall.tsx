import type { DepartureStopAssignment } from "./DepartureStopAssignment.tsx";

export interface EstimatedCall {
  stopPointRef: string;
  order: number;
  stopPointName: string;
  cancellation: boolean;
  requestStop: boolean;
  destinationDisplay: string;
  aimedArrivalTime: string;
  expectedArrivalTime: string;
  aimedDepartureTime: string;
  expectedDepartureTime: string;
  arrivalStatus: string;
  arrivalBoardingActivity: string;
  departureStatus: string;
  departureBoardingActivity: string;
  departureStopAssignment: DepartureStopAssignment;
}
