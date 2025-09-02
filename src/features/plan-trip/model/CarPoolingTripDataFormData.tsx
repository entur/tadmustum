import { Dayjs } from 'dayjs';

export type CarPoolingTripDataFormData = {
  codespace: string;
  authority: string;
  operator: string;
  id?: string;
  lineName: string;
  destinationDisplay: string;
  departureStopName: string;
  departureDatetime: Dayjs;
  departureFlexibleStop: string;
  destinationStopName: string;
  destinationDatetime: Dayjs;
  destinationFlexibleStop: string;
};
