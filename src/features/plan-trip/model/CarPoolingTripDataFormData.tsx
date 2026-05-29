import type { Dayjs } from 'dayjs';
import type { Position } from 'geojson';
import type { EstimatedCall } from '../../../shared/model/EstimatedCall.tsx';

export type CarPoolingTripDataFormData = {
  authority: string;
  operator: string;
  id?: string;
  lineRef?: string;
  estimatedVehicleJourneyCode?: string;
  departureStopName: string;
  departureDatetime: Dayjs;
  // UI-only: when true the arrival time is estimated from OTP routing and the
  // arrival picker is disabled. Not part of the SIRI payload. Left unset when
  // editing an existing trip so the saved arrival is preserved.
  estimateArrivalAutomatically?: boolean;
  departureFlexibleStop: Position | null;
  departureCancellation: boolean;
  destinationStopName: string;
  destinationDatetime: Dayjs;
  destinationFlexibleStop: Position | null;
  destinationCancellation: boolean;
  intermediateCalls: EstimatedCall[];
  tripCancellation: boolean;
  driverDeviationBudget: number;
  contactUrl: string | null;
  totalCapacity: number | null;
  onboardCount: number | null;
};
