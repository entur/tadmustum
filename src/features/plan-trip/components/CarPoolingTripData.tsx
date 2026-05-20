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
import { useStopsController } from '../hooks/useStopsController.tsx';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData.tsx';
import { useQueryExtraJourney } from '../hooks/useQueryOneExtraJourney.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import loadFeatureFromFlexArea from '../util/loadFeatureFromFlexArea.tsx';
import mapToFormData from '../util/mapToFormData.tsx';

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
  onZoomToAllFeatures: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  loadedFlexibleStop: (stops: Feature[]) => void;
  onDepartureStopChange: (id: string | null) => void;
  onArrivalStopChange: (id: string | null) => void;
}

export type CarPoolingTripDataHandle = {
  onStopCreated: (feature: Feature) => void;
  onDrawingStateChange: (isDrawing: boolean) => void;
};

const CarPoolingTripData = forwardRef<CarPoolingTripDataHandle, CarPoolingTripDataProps>(
  (stops, ref) => {
    const {
      onAddFlexibleStop,
      onRemoveFlexibleStop,
      onZoomToFeature,
      onZoomToAllFeatures,
      tripId,
      loadedFlexibleStop,
      onDepartureStopChange,
      onArrivalStopChange,
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
    const [currentTripId, setCurrentTripId] = useState<string | undefined>(undefined);
    const [initialState, setInitialState] = useState<CarPoolingTripDataFormData | undefined>(
      undefined
    );
    const [tripData, setTripData] = useState<Extrajourney | null>(null);
    const initializing = useRef<boolean>(false);

    const stopsController = useStopsController({
      onAddFlexibleStop,
      onRemoveFlexibleStop,
      onDepartureStopChange,
      onArrivalStopChange,
    });
    const {
      departureStop,
      arrivalStop,
      drawingStopsAllowed,
      startAddDepartureStop,
      startAddArrivalStop,
      removeDepartureStop,
      removeArrivalStop,
      resetStops,
      initializeStops,
      onStopCreated,
      onDrawingStateChange,
    } = stopsController;

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

    const queryOneExtraJourney = useQueryExtraJourney();

    useEffect(() => {
      const loadInitialState = (id?: string) => {
        if (initializing.current || !id) return;
        initializing.current = true;
        queryOneExtraJourney('ENT', 'ENT:Authority:ENT', id)
          .then(result => {
            if (result.data?.extraJourney) {
              const journey = result.data.extraJourney as Extrajourney;
              const state = mapToFormData(journey);
              setInitialState(state);
              setTripData(journey);

              // Load all flexible stops from all estimated calls
              const calls = journey.estimatedVehicleJourney.estimatedCalls.estimatedCall;
              const allFeatures: Feature[] = [];

              calls.forEach(call => {
                const flexArea = call.departureStopAssignment?.expectedFlexibleArea;
                const feature = loadFeatureFromFlexArea(flexArea);
                if (feature !== null) {
                  allFeatures.push(feature);
                }
              });

              if (allFeatures.length >= 2) {
                initializeStops(allFeatures[0], allFeatures[allFeatures.length - 1]);

                // Load all features to the map
                loadedFlexibleStop(allFeatures);

                // Zoom to fit all features with a small delay to ensure map is ready
                setTimeout(() => {
                  onZoomToAllFeatures();
                }, 100);
              }
            }
          })
          .catch(error => {
            showSnackbar(error.message || 'Noe gikk galt under lesing.', 'error');
          });
      };
      setCurrentTripId(tripId);
      loadInitialState(tripId);
    }, [
      handleZoomToFeature,
      initializeStops,
      loadedFlexibleStop,
      onZoomToAllFeatures,
      queryOneExtraJourney,
      tripId,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        onStopCreated,
        onDrawingStateChange,
      }),
      [onStopCreated, onDrawingStateChange]
    );

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        <CarPoolingTripDataForm
          initialState={initialState}
          onAddDeparturestopClick={startAddDepartureStop}
          onRemoveDepartureStopClick={removeDepartureStop}
          onAddDestinationtopClick={startAddArrivalStop}
          onRemoveDestinationStopClick={removeArrivalStop}
          onResetCallback={resetStops}
          onSubmitCallback={handleSubmitCallback}
          onViewTripCallback={onZoomToAllFeatures}
          onZoomToFeature={handleZoomToFeature}
          drawingStopsAllowed={drawingStopsAllowed}
          mapDepartureFlexibleStop={departureStop}
          mapDestinationFlexibleStop={arrivalStop}
          tripData={tripData}
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
