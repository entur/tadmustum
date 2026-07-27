import type { EstimatedCalls } from './EstimatedCalls.tsx';
import type { FramedVehicleJourneyRef } from './FramedVehicleJourneyRef.tsx';
import type { SimpleContactStructure } from './SimpleContactStructure.tsx';

export interface EstimatedVehicleJourney {
  recordedAtTime: string;
  lineRef: string;
  directionRef: string;
  // Set on flex booked tours, which attach real-time state to a ServiceJourney that already
  // exists in the timetable; absent on carpool trips, which create the journey themselves.
  framedVehicleJourneyRef?: FramedVehicleJourneyRef;
  cancellation: boolean;
  estimatedVehicleJourneyCode: string;
  extraJourney: boolean;
  vehicleMode: string;
  routeRef: string;
  publishedLineName: string;
  groupOfLinesRef: string;
  // Mandatory in the SIRI profile but unused here; both producers send it empty.
  externalLineRef?: string;
  operatorRef: string;
  monitored: boolean;
  dataSource: string;
  estimatedCalls: EstimatedCalls;
  isCompleteStopSequence: boolean;
  publicContact: SimpleContactStructure;
}
