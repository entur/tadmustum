import type { EstimatedCalls } from "./EstimatedCalls.tsx";

export interface EstimatedVehicleJourney {
  recordedAtTime: string;
  lineRef: string;
  directionRef: string;
  cancellation: boolean;
  estimatedVehicleJourneyCode: string;
  extraJourney: boolean;
  vehicleMode: string;
  routeRef: string;
  publishedLineName: string;
  groupOfLinesRef: string;
  operatorRef: string;
  monitored: boolean;
  dataSource: string;
  estimatedCalls: EstimatedCalls;
  isCompleteStopSequence: boolean;
  expiresAtEpochMs: number;
}
