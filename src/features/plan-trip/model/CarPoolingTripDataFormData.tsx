import type { Dayjs } from 'dayjs';
import type { Position } from 'geojson';
import type { EstimatedCall } from '../../../shared/model/EstimatedCall.tsx';

export type CarPoolingTripDataFormData = {
  codespace: string;
  authority: string;
  operator: string;
  id?: string;
  lineRef?: string;
  estimatedVehicleJourneyCode?: string;
  departureDestinationDisplay: string;
  destinationDestinationDisplay: string;
  departureStopName: string;
  departureDatetime: Dayjs;
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
