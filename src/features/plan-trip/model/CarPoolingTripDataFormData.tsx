import type { Dayjs } from 'dayjs';
import type { Position } from 'geojson';

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
  destinationStopName: string;
  destinationDatetime: Dayjs;
  destinationFlexibleStop: Position | null;
  driverDeviationBudget: number | null;
  contactUrl: string | null;
  totalCapacity: number | null;
  onboardCount: number | null;
};
