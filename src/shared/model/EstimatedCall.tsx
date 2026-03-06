import type { DepartureStopAssignment } from './DepartureStopAssignment.tsx';
import type { VehicleOccupancyStructure } from './VehicleOccupancyStructure.tsx';
import type { PassengerCapacityStructure } from './PassengerCapacityStructure.tsx';

export interface EstimatedCall {
  stopPointRef: string;
  order: number;
  stopPointName: string;
  destinationDisplay: string;
  aimedArrivalTime?: string;
  expectedArrivalTime?: string;
  latestExpectedArrivalTime?: string;
  aimedDepartureTime?: string;
  expectedDepartureTime?: string;
  arrivalBoardingActivity?: string;
  departureBoardingActivity?: string;
  departureStopAssignment: DepartureStopAssignment;
  expectedDepartureOccupancy?: VehicleOccupancyStructure[];
  expectedDepartureCapacities?: PassengerCapacityStructure[];
}
