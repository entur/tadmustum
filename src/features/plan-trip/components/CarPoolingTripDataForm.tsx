import { Controller, type Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { LocationOn, PersonPin, Hail, SensorsOff, Cancel, Replay } from '@mui/icons-material';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuthorities } from '../../../shared/hooks/useAuthorities.tsx';
import { useOperators } from '../hooks/useOperators.tsx';
import { useStreetRoute } from '../hooks/useStreetRoute.tsx';
import type { Feature, Point, Position } from 'geojson';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData.tsx';
import { carPoolingTripDataSchema } from '../model/carPoolingTripDataSchema.tsx';
import { humanizeCode } from '../../../shared/error-message/humanizeCode.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import dayjs from 'dayjs';

export interface CarPoolingTripDataFormProps {
  initialState?: CarPoolingTripDataFormData;
  onAddDeparturestopClick: () => void;
  onRemoveDepartureStopClick: () => void;
  onAddDestinationtopClick: () => void;
  onRemoveDestinationStopClick: () => void;
  onResetCallback: () => void;
  onSubmitCallback: (formData: CarPoolingTripDataFormData) => void;
  onViewTripCallback: () => void;
  onZoomToFeature: (id: string) => void;
  mapDepartureFlexibleStop: Feature | null;
  mapDestinationFlexibleStop: Feature | null;
  drawingStopsAllowed: boolean;
  tripData?: Extrajourney | null;
}

export default function CarPoolingTripDataForm(props: CarPoolingTripDataFormProps) {
  const {
    initialState,
    onAddDeparturestopClick,
    onRemoveDepartureStopClick,
    onAddDestinationtopClick,
    onRemoveDestinationStopClick,
    onResetCallback,
    onSubmitCallback,
    onViewTripCallback,
    onZoomToFeature,
    mapDepartureFlexibleStop,
    mapDestinationFlexibleStop,
    drawingStopsAllowed,
    tripData,
  } = props;
  const { authorities } = useAuthorities();
  const operators = useOperators();

  // New trips get a client-generated id so the booking URL (this app's
  // /book-trip/{id} page) can be prefilled before the trip is saved; the
  // backend upserts at the supplied id. When editing, reset(initialState)
  // replaces both with the existing trip's values.
  const newTripId = useMemo(() => uuidv4(), []);
  const defaultBookingUrl = `${window.location.origin}/book-trip/${newTripId}`;

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm<CarPoolingTripDataFormData>({
    // Cast: schema requires non-null Position; form models the pre-validation null state.
    resolver: yupResolver(carPoolingTripDataSchema) as Resolver<CarPoolingTripDataFormData>,
    mode: 'onBlur', // or "onChange", depending on UX preference
    defaultValues: {
      codespace: 'ENT', // TODO fix hardcoding
      authority: '',
      operator: '',
      id: newTripId,
      departureStopName: 'Origin',
      departureFlexibleStop: null,
      departureCancellation: false,
      destinationStopName: 'Destination',
      destinationFlexibleStop: null,
      destinationCancellation: false,
      intermediateCalls: [],
      tripCancellation: false,
      driverDeviationBudget: 15,
      contactUrl: defaultBookingUrl,
      totalCapacity: 5,
      onboardCount: 1,
    },
  });

  const authority = watch('authority');
  const operator = watch('operator');
  const departureFlexibleStop: Position | null = watch('departureFlexibleStop');
  const destinationFlexibleStop: Position | null = watch('destinationFlexibleStop');
  const departureDatetime = watch('departureDatetime');
  const departureCancellation = watch('departureCancellation');
  const destinationCancellation = watch('destinationCancellation');
  const intermediateCalls = watch('intermediateCalls');
  const tripCancellation = watch('tripCancellation');
  const streetRoute = useStreetRoute();
  const [error, setError] = useState<AppError | undefined>(undefined);
  const [errorDismissed, setErrorDismissed] = useState<boolean>(false);
  const [initialStateSet, setInitialStateSet] = useState<boolean>(false);

  useEffect(() => {
    if (authorities.length && !authority) {
      setValue('authority', authorities[0].id);
    }

    if (operators.length && !operator) {
      const enturOperator = operators.find(o => o.name.toLowerCase().includes('entur'));
      if (enturOperator) {
        setValue('operator', enturOperator.id);
      }
    }

    if (mapDepartureFlexibleStop) {
      setValue('departureFlexibleStop', (mapDepartureFlexibleStop.geometry as Point).coordinates);
    } else {
      setValue('departureFlexibleStop', null);
    }

    if (mapDestinationFlexibleStop) {
      setValue(
        'destinationFlexibleStop',
        (mapDestinationFlexibleStop.geometry as Point).coordinates
      );
    } else {
      setValue('destinationFlexibleStop', null);
    }

    const messages: string[] = [];
    if (errors?.departureFlexibleStop?.message) {
      messages.push(errors.departureFlexibleStop.message);
    }
    if (errors?.destinationFlexibleStop?.message) {
      messages.push(errors.destinationFlexibleStop.message);
    }
    const msg = messages.join('\n');

    if (!error && msg.length > 0) {
      setError({ message: msg, code: 'VALIDATION_ERROR' });
    } else if (error?.code === 'VALIDATION_ERROR' && msg === '') {
      setError(undefined);
      setErrorDismissed(false);
    }

    if (initialState && !initialStateSet) {
      setInitialStateSet(true);
      reset(initialState);
    }
  }, [
    initialStateSet,
    setInitialStateSet,
    initialState,
    reset,
    authorities,
    authority,
    operators,
    operator,
    mapDepartureFlexibleStop,
    mapDestinationFlexibleStop,
    setValue,
    drawingStopsAllowed,
    error,
    errors?.departureFlexibleStop?.message,
    errors?.destinationFlexibleStop?.message,
  ]);

  const departureLng = departureFlexibleStop?.[0];
  const departureLat = departureFlexibleStop?.[1];
  const destinationLng = destinationFlexibleStop?.[0];
  const destinationLat = destinationFlexibleStop?.[1];
  const departureMs = departureDatetime?.isValid() ? departureDatetime.valueOf() : undefined;

  useEffect(() => {
    if (
      departureLng == null ||
      departureLat == null ||
      destinationLng == null ||
      destinationLat == null ||
      departureMs == null
    ) {
      return;
    }
    let cancelled = false;
    streetRoute(
      [departureLng, departureLat],
      [destinationLng, destinationLat],
      dayjs(departureMs).toISOString()
    )
      .then(result => {
        if (cancelled || !result) return;
        if (result.expectedEndTime) {
          setValue('destinationDatetime', dayjs(result.expectedEndTime), {
            shouldValidate: true,
          });
        }
        if (result.fromName) {
          setValue('departureStopName', result.fromName, { shouldValidate: true });
        }
        if (result.toName) {
          setValue('destinationStopName', result.toName, { shouldValidate: true });
        }
      })
      .catch(() => {
        // Ignore street-routing failures; user can still set arrival manually.
      });
    return () => {
      cancelled = true;
    };
  }, [
    departureLng,
    departureLat,
    destinationLng,
    destinationLat,
    departureMs,
    streetRoute,
    setValue,
  ]);

  // Helper function to determine stop type and get appropriate icon/color
  const getStopTypeInfo = (
    call: Extrajourney['estimatedVehicleJourney']['estimatedCalls']['estimatedCall'][0],
    index: number,
    totalStops: number
  ) => {
    const isFirst = index === 0;
    const isLast = index === totalStops - 1;
    const isPickup =
      call.stopPointName?.includes('Pickup') ||
      (call.departureBoardingActivity === 'boarding' && !isFirst);
    const isDropoff =
      call.stopPointName?.includes('Dropoff') ||
      (call.arrivalBoardingActivity === 'alighting' && !isLast);

    const latestTime = call.latestExpectedArrivalTime;

    if (isFirst) {
      return {
        icon: LocationOn,
        color: 'success' as const,
        label: 'Departure',
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Departure' as const,
        latestTime,
      };
    } else if (isLast) {
      return {
        icon: LocationOn,
        color: 'error' as const,
        label: 'Destination',
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Arrival' as const,
        latestTime,
      };
    } else if (isPickup) {
      return {
        icon: PersonPin,
        color: 'primary' as const,
        label: 'Passenger Pickup',
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Pickup' as const,
        latestTime,
      };
    } else if (isDropoff) {
      return {
        icon: Hail,
        color: 'secondary' as const,
        label: 'Passenger Dropoff',
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Dropoff' as const,
        latestTime,
      };
    } else {
      return {
        icon: SensorsOff,
        color: 'action' as const,
        label: 'Stop',
        time:
          call.aimedArrivalTime ||
          call.aimedDepartureTime ||
          call.expectedArrivalTime ||
          call.expectedDepartureTime,
        timeType: 'Stop' as const,
        latestTime,
      };
    }
  };

  const estimatedCalls = tripData?.estimatedVehicleJourney.estimatedCalls?.estimatedCall || [];

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}
      component="form"
      onSubmit={handleSubmit(onSubmitCallback, () => setErrorDismissed(false))}
      noValidate
      autoComplete="off"
    >
      <Snackbar
        open={!!error && !errorDismissed}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={() => setErrorDismissed(true)}
          sx={{ width: '100%', whiteSpace: 'pre-line' }}
        >
          {error?.code ? `${humanizeCode(error.code)}: ${error.message}` : error?.message}
        </Alert>
      </Snackbar>
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Typography
          variant="h5"
          component="h1"
          sx={{
            textDecoration: tripCancellation ? 'line-through' : 'none',
            color: tripCancellation ? 'text.disabled' : 'text.primary',
          }}
        >
          Trip data
        </Typography>
        {tripCancellation && <Chip label="Cancelled" size="small" color="error" />}
        {/* Cancellation is only available when editing an existing trip, not while creating one. */}
        {tripData && (
          <IconButton
            size="small"
            onClick={() => setValue('tripCancellation', !tripCancellation, { shouldDirty: true })}
            aria-label={tripCancellation ? 'Restore trip' : 'Cancel trip'}
            title={tripCancellation ? 'Restore trip' : 'Cancel trip'}
          >
            {tripCancellation ? <Replay fontSize="small" /> : <Cancel fontSize="small" />}
          </IconButton>
        )}
      </Box>

      {/* All Stops Display */}
      {estimatedCalls.length > 0 && (
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Trip Route ({estimatedCalls.length} stops)
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {estimatedCalls.map((call, index) => {
              const stopInfo = getStopTypeInfo(call, index, estimatedCalls.length);
              const IconComponent = stopInfo.icon;
              const isFirst = index === 0;
              const isLast = index === estimatedCalls.length - 1;
              const intermediateIndex = isFirst || isLast ? -1 : index - 1;
              const cancelled = isFirst
                ? departureCancellation
                : isLast
                  ? destinationCancellation
                  : (intermediateCalls?.[intermediateIndex]?.cancellation ??
                    call.cancellation ??
                    false);
              const toggleCancellation = () => {
                if (isFirst) {
                  setValue('departureCancellation', !departureCancellation, {
                    shouldDirty: true,
                  });
                } else if (isLast) {
                  setValue('destinationCancellation', !destinationCancellation, {
                    shouldDirty: true,
                  });
                } else {
                  const current = intermediateCalls ?? [];
                  const next = current.map((c, i) =>
                    i === intermediateIndex ? { ...c, cancellation: !(c.cancellation ?? false) } : c
                  );
                  setValue('intermediateCalls', next, { shouldDirty: true });
                }
              };

              return (
                <Box key={call.order || index} display="flex" alignItems="center" gap={2}>
                  <IconComponent color={cancelled ? 'disabled' : stopInfo.color} />
                  <Box sx={{ flex: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          textDecoration: cancelled ? 'line-through' : 'none',
                          color: cancelled ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {call.stopPointName}
                      </Typography>
                      <Chip
                        label={stopInfo.label}
                        size="small"
                        variant="outlined"
                        color={stopInfo.color === 'action' ? 'default' : stopInfo.color}
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                      />
                      {cancelled && (
                        <Chip
                          label="Cancelled"
                          size="small"
                          color="error"
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      )}
                    </Box>
                    {stopInfo.time && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textDecoration: cancelled ? 'line-through' : 'none' }}
                      >
                        {stopInfo.timeType}: {new Date(stopInfo.time).toLocaleString()}
                        {stopInfo.latestTime && (
                          <> (latest: {new Date(stopInfo.latestTime).toLocaleTimeString()})</>
                        )}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={toggleCancellation}
                    aria-label={cancelled ? 'Restore stop' : 'Cancel stop'}
                    title={cancelled ? 'Restore stop' : 'Cancel stop'}
                  >
                    {cancelled ? <Replay fontSize="small" /> : <Cancel fontSize="small" />}
                  </IconButton>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: '30px' }}>
                    #{call.order}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}
      <FormControl fullWidth required error={!!errors.authority} margin="normal">
        <InputLabel id="authority-label">Authority</InputLabel>
        <Controller
          name="authority"
          control={control}
          render={({ field }) => {
            return (
              <Select {...field} labelId="authority-label" label="Authority">
                <MenuItem value="" disabled>
                  <em>Authority</em>
                </MenuItem>
                {field.value && !authorities.some(a => a.id === field.value) && (
                  <MenuItem value={field.value}>{field.value}</MenuItem>
                )}
                {authorities.map(authority => (
                  <MenuItem key={authority.id} value={authority.id}>
                    {authority.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }}
        />
        <FormHelperText>{errors.authority?.message}</FormHelperText>
      </FormControl>
      <FormControl fullWidth required error={!!errors.operator} margin="normal">
        <InputLabel id="operator-label">Operator</InputLabel>
        <Controller
          name="operator"
          control={control}
          render={({ field }) => {
            return (
              <Select {...field} labelId="operator-label" label="Operator">
                <MenuItem value="" disabled>
                  <em>Operator</em>
                </MenuItem>
                {field.value && !operators.some(o => o.id === field.value) && (
                  <MenuItem value={field.value}>{field.value}</MenuItem>
                )}
                {operators.map(operator => (
                  <MenuItem key={operator.id} value={operator.id}>
                    {operator.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }}
        />
        <FormHelperText>{errors.operator?.message}</FormHelperText>
      </FormControl>
      <Typography variant="h6" component="h2">
        Departure
      </Typography>
      <Controller
        name="departureStopName"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              label="Departure stop name"
              error={!!errors.departureStopName}
              helperText={errors.departureStopName?.message}
              required
              fullWidth
            />
          );
        }}
      />
      <Controller
        name="departureDatetime"
        control={control}
        render={({ field, fieldState: { error } }) => {
          return (
            <DateTimePicker
              {...field}
              ampm={false}
              label="Select departure time"
              value={field.value || null}
              onChange={value => field.onChange(value)}
              slotProps={{
                textField: {
                  error: !!error,
                  helperText: error?.message,
                  fullWidth: true,
                  required: true,
                },
              }}
            />
          );
        }}
      />
      <Button
        variant="contained"
        disabled={!!departureFlexibleStop || !drawingStopsAllowed}
        onClick={() => onAddDeparturestopClick()}
      >
        Add stop
      </Button>
      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          onClick={onRemoveDepartureStopClick}
          disabled={!departureFlexibleStop}
        >
          Remove stop
        </Button>
        {mapDepartureFlexibleStop?.id && (
          <IconButton
            disabled={!departureFlexibleStop}
            aria-label="Zoom to destination stop"
            onClick={() => onZoomToFeature(mapDepartureFlexibleStop.id as string)}
          >
            <GpsFixedIcon />
          </IconButton>
        )}
      </Box>
      <Divider />
      <Typography variant="h6" component="h2">
        Destination
      </Typography>
      <Controller
        name="destinationStopName"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              label="Destination stop name"
              error={!!errors.destinationStopName}
              helperText={errors.destinationStopName?.message}
              required
              fullWidth
            />
          );
        }}
      />
      <Controller
        name="destinationDatetime"
        control={control}
        render={({ field, fieldState: { error } }) => {
          return (
            <DateTimePicker
              {...field}
              ampm={false}
              label="Select arrival time"
              value={field.value || null}
              onChange={value => field.onChange(value)}
              slotProps={{
                textField: {
                  error: !!error,
                  helperText: error?.message,
                  fullWidth: true,
                  required: true,
                },
              }}
            />
          );
        }}
      />
      <Button
        variant="contained"
        disabled={!!destinationFlexibleStop || !drawingStopsAllowed}
        onClick={() => onAddDestinationtopClick()}
      >
        Add stop
      </Button>
      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          onClick={onRemoveDestinationStopClick}
          disabled={!destinationFlexibleStop}
        >
          Remove stop
        </Button>
        {mapDestinationFlexibleStop?.id && (
          <IconButton
            disabled={!destinationFlexibleStop}
            aria-label="Zoom to destination stop"
            onClick={() => onZoomToFeature(mapDestinationFlexibleStop.id as string)}
          >
            <GpsFixedIcon />
          </IconButton>
        )}
      </Box>

      <Divider />

      <Controller
        name="driverDeviationBudget"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Driver deviation budget in minutes"
              error={!!errors.driverDeviationBudget}
              helperText={errors.driverDeviationBudget?.message}
              required
              fullWidth
            />
          );
        }}
      />

      <Controller
        name="contactUrl"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Booking URL"
              error={!!errors.contactUrl}
              helperText={errors.contactUrl?.message}
              fullWidth
            />
          );
        }}
      />

      <Controller
        name="totalCapacity"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Total Capacity"
              error={!!errors.totalCapacity}
              helperText={errors.totalCapacity?.message}
              fullWidth
            />
          );
        }}
      />

      <Controller
        name="onboardCount"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Number of people in the vehicle"
              error={!!errors.onboardCount}
              helperText={errors.onboardCount?.message}
              fullWidth
            />
          );
        }}
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button type="submit" variant="contained" color="primary">
          Submit trip
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            // When editing, restore the loaded trip exactly; when creating,
            // reset() with no argument clears back to the blank defaults.
            reset(initialState);
            clearErrors();
            onResetCallback();
          }}
        >
          Reset
        </Button>
        <Button variant="outlined" onClick={onViewTripCallback}>
          Zoom
        </Button>
      </Box>
    </Box>
  );
}
