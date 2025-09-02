import React, {
  forwardRef,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { type AlertProps, Box, type SnackbarCloseReason } from '@mui/material';
import type { Feature } from 'geojson';
import CarPoolingTripDataForm from './CarPoolingTripDataForm.tsx';
import { useMutateExtrajourney } from '../hooks/useMutateExtrajourney.tsx';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData.tsx';
import type { MapModes } from '../../../shared/components/EditableMap.tsx';
import { useQueryExtraJourney } from '../hooks/useQueryOneExtraJourney.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import dayjs from 'dayjs';
import loadFeatureUtil from '../util/loadFeatureUtil.tsx';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}
export interface CarPoolingTripDataProps {
  tripId?: string;
  onAddFlexibleStop: () => void;
  onZoomToFeature: (id: string) => void;
  onRemoveFlexibleStop: (id: string) => void;
  onStopCreatedCallback: () => Feature | null | undefined;
  loadedFlexibleStop: (stops: Feature[]) => void;
}

export type CarPoolingTripDataHandle = {
  handleEditableMapModeChange: (args: { prevMode: MapModes; mode: MapModes }) => void;
};

const CarPoolingTripData = forwardRef<CarPoolingTripDataHandle, CarPoolingTripDataProps>(
  (stops, ref) => {
    const [drawingStopsAllowed, setDrawingStopsAllowed] = useState<boolean>(true);
    const {
      onAddFlexibleStop,
      onRemoveFlexibleStop,
      onStopCreatedCallback,
      onZoomToFeature,
      tripId,
      loadedFlexibleStop,
    } = stops;
    const [snackbar, setSnackbar] = useState<SnackbarState>({
      open: false,
      message: '',
      severity: 'success', // "success" | "error" | "info" | "warning"
    });
    const showSnackbar = (message: string, severity: SnackbarSeverity) => {
      setSnackbar({ open: true, message, severity });
    };
    const handleSnackbarClose = (
      _event: Event | SyntheticEvent<Element, Event>,
      reason?: SnackbarCloseReason
    ) => {
      if (reason === 'clickaway') return;
      setSnackbar(prev => ({ ...prev, open: false }));
    };
    const [departureStop, setDepartureStop] = useState<Feature | null>(null);
    const [arrivalStop, setArrivalStop] = useState<Feature | null>(null);
    const [currentStop, setCurrentStop] = useState<null | 'departure' | 'arrival'>(null);
    const [currentTripId, setCurrentTripId] = useState<string | undefined>(undefined);
    const [initialState, setInitialState] = useState<CarPoolingTripDataFormData | undefined>(
      undefined
    );
    const initializing = useRef<boolean>(false);

    const mutateExtrajourney = useMutateExtrajourney();
    const handleSubmitCallback = async (formData: CarPoolingTripDataFormData) => {
      formData.id = currentTripId;
      const result = await mutateExtrajourney(formData);
      if (result.error) {
        showSnackbar(result.error.message || 'Noe gikk galt under lagring.', 'error');
      } else {
        showSnackbar('Turen ble lagret!', 'success');
        setCurrentTripId(result.data);
      }
    };
    const handleZoomToFeature = useCallback(
      (featureId: string) => {
        onZoomToFeature(featureId);
      },
      [onZoomToFeature]
    );

    const handleResetCallback = () => {
      removeDepartureStop();
      removeArrivalStop();
    };
    const removeDepartureStop = () => {
      if (departureStop) {
        onRemoveFlexibleStop(departureStop?.id as string);
      }
      setDepartureStop(null);
    };
    const removeArrivalStop = () => {
      if (arrivalStop) {
        onRemoveFlexibleStop(arrivalStop?.id as string);
      }
      setArrivalStop(null);
    };
    const startAddDepartureStop = () => {
      setCurrentStop('departure');
      onAddFlexibleStop();
    };
    const startAddArrivalStop = () => {
      setCurrentStop('arrival');
      onAddFlexibleStop();
    };
    const queryOneExtraJourney = useQueryExtraJourney();
    const handleEditableMapModeChange = useCallback(
      (args: { prevMode: MapModes; mode: MapModes }) => {
        if (args.prevMode == 'drawing' && args.mode != 'drawing') {
          const stopCreatedCallback = onStopCreatedCallback();

          if (currentStop == 'departure') {
            setDepartureStop(stopCreatedCallback ? stopCreatedCallback : null);
          } else if (currentStop == 'arrival') {
            setArrivalStop(stopCreatedCallback ? stopCreatedCallback : null);
          }
          setCurrentStop(null);
        }

        setDrawingStopsAllowed(args.mode === 'viewing');
      },
      [currentStop, onStopCreatedCallback]
    );

    useEffect(() => {
      const mapToFormdData = (journey: Extrajourney): CarPoolingTripDataFormData => {
        return {
          codespace: 'ENT',
          authority: 'ENT:Authority:ENT',
          operator: journey.estimatedVehicleJourney.operatorRef,
          id: journey.id,
          lineName: journey.estimatedVehicleJourney.publishedLineName,
          destinationDisplay:
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0].destinationDisplay,
          departureStopName:
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0].stopPointName,
          departureDatetime: dayjs(
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0].aimedDepartureTime
          ),
          departureFlexibleStop:
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0].departureStopAssignment
              .expectedFlexibleArea.polygon.exterior.posList,
          destinationStopName:
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[1].stopPointName,
          destinationDatetime: dayjs(
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[1].aimedArrivalTime
          ),
          destinationFlexibleStop:
            journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[1].departureStopAssignment
              .expectedFlexibleArea.polygon.exterior.posList,
        };
      };
      const loadInitialState = (id?: string) => {
        if (initializing.current || !id) return;
        initializing.current = true;
        queryOneExtraJourney('ENT', 'ENT:Authority:ENT', id)
          .then(result => {
            if (result.data?.extraJourney) {
              const state = mapToFormdData(result.data.extraJourney as Extrajourney);
              setInitialState(state);
              const departure = loadFeatureUtil({
                posList: state.departureFlexibleStop,
              });
              setDepartureStop(departure);
              handleZoomToFeature(departure?.id as string);
              const destination = loadFeatureUtil({
                posList: state.destinationFlexibleStop,
              });
              setArrivalStop(destination);

              loadedFlexibleStop([departure, destination]);
            }
          })
          .catch(error => {
            showSnackbar(error.message || 'Noe gikk galt under lesing.', 'error');
          });
      };
      setCurrentTripId(tripId);
      loadInitialState(tripId);
    }, [handleZoomToFeature, loadedFlexibleStop, queryOneExtraJourney, tripId]);

    useImperativeHandle(ref, () => ({
      handleEditableMapModeChange,
    }));

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        <CarPoolingTripDataForm
          initialState={initialState}
          onAddDeparturestopClick={startAddDepartureStop}
          onRemoveDepartureStopClick={removeDepartureStop}
          onAddDestinationtopClick={startAddArrivalStop}
          onRemoveDestinationStopClick={removeArrivalStop}
          onResetCallback={handleResetCallback}
          onSubmitCallback={handleSubmitCallback}
          onZoomToFeature={handleZoomToFeature}
          drawingStopsAllowed={drawingStopsAllowed}
          mapDepartureFlexibleStop={departureStop}
          mapDestinationFlexibleStop={arrivalStop}
        />
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Slide in from top
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
);

export default CarPoolingTripData;
