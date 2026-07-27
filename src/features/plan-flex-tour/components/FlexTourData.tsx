import React, { forwardRef, type SyntheticEvent, useImperativeHandle, useState } from 'react';
import { type AlertProps, Box, type SnackbarCloseReason } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import type { Feature } from 'geojson';
import FlexTourDataForm from './FlexTourDataForm.tsx';
import { useMutateFlexTour } from '../hooks/useMutateFlexTour.tsx';
import { useFlexTourStops } from '../hooks/useFlexTourStops.tsx';
import type { FlexTourFormData } from '../model/FlexTourFormData.tsx';
import { userFacingMessage } from '../../../shared/error-message/userFacingMessage.tsx';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

export interface FlexTourDataProps {
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  onRemoveAllFlexibleStops: () => void;
  onZoomToFeature: (id: string) => void;
  onZoomToAllFeatures: () => void;
}

export type FlexTourDataHandle = {
  onStopCreated: (feature: Feature) => void;
  onDrawingStateChange: (isDrawing: boolean) => void;
};

const FlexTourData = forwardRef<FlexTourDataHandle, FlexTourDataProps>((props, ref) => {
  const {
    onAddFlexibleStop,
    onRemoveFlexibleStop,
    onRemoveAllFlexibleStops,
    onZoomToFeature,
    onZoomToAllFeatures,
  } = props;

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
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

  const stops = useFlexTourStops({ onAddFlexibleStop, onRemoveFlexibleStop });
  const mutateFlexTour = useMutateFlexTour();

  const handleSubmit = async (formData: FlexTourFormData) => {
    const result = await mutateFlexTour(formData);
    if (result.error) {
      showSnackbar(userFacingMessage(result.error, 'Noe gikk galt under lagring.'), 'error');
      return;
    }
    // There is no flex tour list to navigate to yet, and the tour keeps its identity across
    // saves (journey code = ServiceJourney:date), so stay on the form: the usual next step is
    // to adjust a time or budget and re-send.
    showSnackbar('Turen ble lagret!', 'success');
  };

  useImperativeHandle(
    ref,
    () => ({
      onStopCreated: stops.onStopCreated,
      onDrawingStateChange: stops.onDrawingStateChange,
    }),
    [stops.onStopCreated, stops.onDrawingStateChange]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <FlexTourDataForm
        onSubmitCallback={handleSubmit}
        onResetCallback={onRemoveAllFlexibleStops}
        onAddAnchorClick={stops.startAddAnchor}
        onAddBookedStopClick={stops.startAddBookedStop}
        onRemoveStop={stops.removeStop}
        onZoomToFeature={onZoomToFeature}
        onViewTourCallback={onZoomToAllFeatures}
        drawingStopsAllowed={stops.drawingStopsAllowed}
        registerStopPlacedHandler={stops.setOnStopPlaced}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default FlexTourData;
