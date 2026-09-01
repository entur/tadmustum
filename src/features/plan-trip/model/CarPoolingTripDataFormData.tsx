import type { Dayjs } from 'dayjs';
import type { Position } from 'geojson';
import type { EstimatedCall } from '../../../shared/model/EstimatedCall.tsx';

export type CarPoolingTripDataFormData = {
  // Bare codespace (e.g. 'ENT'). Becomes the journey's SIRI DataSource — the
  // tenant key nunamnir authorizes the write on.
  dataSource: string;
  id?: string;
  lineRef?: string;
  estimatedVehicleJourneyCode?: string;
  departureStopName: string;
  departureDatetime: Dayjs;
  // UI-only: when true the arrival time is estimated from OTP routing and the
  // arrival picker is disabled. Not part of the SIRI payload. Left unset when
  // editing an existing trip so the saved arrival is preserved.
  estimateArrivalAutomatically?: boolean;
  // UI-only: when true both stop names are filled in from the nearest known
  // place (see nearestPlaceName) whenever a stop moves, and the name fields are
  // disabled. Not part of the SIRI payload. Off when editing an existing trip
  // so a saved name is never overwritten.
  setStopNamesAutomatically?: boolean;
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
