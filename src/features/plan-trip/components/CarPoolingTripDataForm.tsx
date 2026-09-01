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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { Cancel, Replay } from '@mui/icons-material';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAllowedCodespaces } from '../../../shared/hooks/useAllowedCodespaces.tsx';
import { useStreetRoute } from '../hooks/useStreetRoute.tsx';
import type { Feature, Point, Position } from 'geojson';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData.tsx';
import {
  carPoolingTripDataSchema,
  MAX_TRIP_DURATION_MINUTES,
} from '../model/carPoolingTripDataSchema.tsx';
import { humanizeCode } from '../../../shared/error-message/humanizeCode.tsx';
import type { AppError } from '../../../shared/error-message/AppError.tsx';
import type { Extrajourney } from '../../../shared/model/Extrajourney.tsx';
import StopOccupancy from '../../../shared/components/StopOccupancy.tsx';
import {
  chainGeometries,
  routeLegChain,
  type RouteLegGeometries,
} from '../../../shared/api/routeLegChain.tsx';
import loadFeatureFromFlexArea from '../util/loadFeatureFromFlexArea.tsx';
import { loadNearestPlaceName } from '../../../shared/geo/loadNearestPlaceName.tsx';
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
  // Reports the routed street geometry whenever it changes — one [lng, lat]
  // linestring per leg of the trip (departure -> intermediate stops ->
  // destination), 'failed' when the journey planner couldn't route it, or
  // null when there is no complete route to draw.
  onRouteGeometryChange?: (legGeometries: RouteLegGeometries) => void;
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
    onRouteGeometryChange,
  } = props;
  // The form drives mutations (createOrUpdateExtrajourney), so restrict the
  // data-source dropdown to codespaces where the user actually has write rights.
  // Without this filter, a view-only user would see codespaces they can't
  // submit to and only learn of the rejection on a 403 from the server.
  const { adminCodespaces } = useAllowedCodespaces();
  // A view-only user opening the new-trip page has no codespace they can
  // submit to. Surface that up front rather than letting them fill out the
  // form only to fail Yup's dataSource-required validation on submit.
  const noAdminAccess = !tripData && adminCodespaces.length === 0;
  // A trip's codespace (its dataSource) is baked into its stable identity — the
  // estimatedVehicleJourneyCode, lineRef and booking URL all carry it, and
  // nunamnir stores the trip under codespaces/{codespace}/…/{code}. There is no
  // move operation: re-submitting an existing trip under a different codespace
  // writes a *new* document and orphans the original (and nunamnir rejects the
  // mismatch outright). So the data source is fixed once a trip exists — lock
  // the picker when editing.
  const isEditing = !!initialState;

  // New trips default to departing exactly a week from now. Computed once so it
  // stays stable across renders (and so Reset returns to the same value).
  const defaultDeparture = useMemo(() => dayjs().add(1, 'week'), []);

  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm<CarPoolingTripDataFormData>({
    // Cast: schema requires non-null Position; form models the pre-validation null state.
    resolver: yupResolver(carPoolingTripDataSchema) as Resolver<CarPoolingTripDataFormData>,
    mode: 'onBlur', // or "onChange", depending on UX preference
    defaultValues: {
      dataSource: '',
      departureStopName: 'Origin',
      departureDatetime: defaultDeparture,
      estimateArrivalAutomatically: true,
      setStopNamesAutomatically: true,
      departureFlexibleStop: null,
      departureCancellation: false,
      destinationStopName: 'Destination',
      destinationFlexibleStop: null,
      destinationCancellation: false,
      intermediateCalls: [],
      tripCancellation: false,
      driverDeviationBudget: 15,
      contactUrl: null,
      totalCapacity: 5,
      onboardCount: 1,
    },
  });

  const dataSource = watch('dataSource');
  const contactUrl = watch('contactUrl');
  const departureFlexibleStop: Position | null = watch('departureFlexibleStop');
  const destinationFlexibleStop: Position | null = watch('destinationFlexibleStop');
  const departureDatetime = watch('departureDatetime');
  const destinationDatetime = watch('destinationDatetime');
  const driverDeviationBudget = watch('driverDeviationBudget');
  const estimateArrivalAutomatically = watch('estimateArrivalAutomatically');
  const setStopNamesAutomatically = watch('setStopNamesAutomatically');
  const departureCancellation = watch('departureCancellation');
  const destinationCancellation = watch('destinationCancellation');
  const intermediateCalls = watch('intermediateCalls');
  const tripCancellation = watch('tripCancellation');
  const streetRoute = useStreetRoute();
  // How many legs the journey planner would not route (null when routing broke
  // outright) — surfaces a warning so the user knows those legs are straight
  // lines on the map and guesses in the timetable.
  const [estimatedLegs, setEstimatedLegs] = useState<number | null>(0);
  const [error, setError] = useState<AppError | undefined>(undefined);
  const [errorDismissed, setErrorDismissed] = useState<boolean>(false);
  const [initialStateSet, setInitialStateSet] = useState<boolean>(false);

  useEffect(() => {
    if (adminCodespaces.length && !dataSource) {
      // Prefer ENT when several codespaces are available; otherwise just take
      // the first. New trips default to whichever codespace the user is most
      // likely to act in.
      setValue('dataSource', adminCodespaces.includes('ENT') ? 'ENT' : adminCodespaces[0]);
    }

    // Fill in the default booking URL once the codespace is known. Skip if the
    // user has already entered something — we never want to clobber a manual
    // edit or an edited trip's existing URL.
    // The booking page (/book-trip/{codespace}/{tripId}) looks a trip up by its
    // estimatedVehicleJourneyCode — nunamnir keys storage on the code and
    // returns it as the journey id — so the URL must carry the code, not the
    // form's local `id`. Generate the code here (matching prepareCarpoolingFormData)
    // when it's absent so a new trip's URL and stored id are identical; when
    // editing, the code was filled in from the existing journey by mapToFormData.
    if (dataSource && !contactUrl) {
      let code = getValues('estimatedVehicleJourneyCode');
      if (!code) {
        code = `${dataSource}:ServiceJourney:${uuidv4()}`;
        setValue('estimatedVehicleJourneyCode', code);
      }
      setValue('contactUrl', `${window.location.origin}/book-trip/${dataSource}/${code}`);
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
    adminCodespaces,
    dataSource,
    contactUrl,
    mapDepartureFlexibleStop,
    mapDestinationFlexibleStop,
    setValue,
    getValues,
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

  // Automatic stop names: each placed stop is named after the nearest place in
  // the bundled place list, so dropping a pin on the map is enough to get a
  // name a driver recognises. Purely local once the list is loaded — no request
  // to a naming service, nothing that can leave a stop unnamed — and it only
  // ever writes while the option is on, so a name typed by hand (option off) or
  // loaded from a saved trip is never overwritten. Turning the option off keeps
  // the last automatic name rather than reverting it, matching how the
  // automatic arrival estimate behaves.
  useEffect(() => {
    const departurePlaced = departureLng != null && departureLat != null;
    const destinationPlaced = destinationLng != null && destinationLat != null;
    if (!setStopNamesAutomatically || (!departurePlaced && !destinationPlaced)) {
      // Nothing on the map yet — the stops keep their default names.
      return;
    }

    let cancelled = false;
    // The place list is a lazily loaded chunk, so the name lands a tick after
    // the stop does.
    loadNearestPlaceName()
      .then(nearestPlaceName => {
        if (cancelled) {
          return;
        }
        const rename = (
          field: 'departureStopName' | 'destinationStopName',
          lng: number | undefined,
          lat: number | undefined
        ) => {
          if (lng == null || lat == null) {
            return;
          }
          const name = nearestPlaceName([lng, lat]);
          if (name && getValues(field) !== name) {
            setValue(field, name, { shouldValidate: true });
          }
        };
        rename('departureStopName', departureLng, departureLat);
        rename('destinationStopName', destinationLng, destinationLat);
      })
      .catch(() => {
        // The chunk could not be loaded (an offline tab, say). The stops keep
        // the names they have and the trip still saves; unticking the option
        // hands the fields back to the user.
      });

    return () => {
      cancelled = true;
    };
  }, [
    setStopNamesAutomatically,
    departureLng,
    departureLat,
    destinationLng,
    destinationLat,
    getValues,
    setValue,
  ]);

  // Warn (but don't block) when the trip span — arrival plus the driver's deviation budget,
  // minus departure — exceeds the limit OTP enforces, so the driver knows a longer trip will be
  // rejected by the journey planner before they save it.
  const tripExceedsMaxDuration = useMemo(() => {
    if (!departureDatetime?.isValid() || !destinationDatetime?.isValid()) {
      return false;
    }
    const budgetMinutes = Number(driverDeviationBudget) || 0;
    const latestArrival = destinationDatetime.add(budgetMinutes, 'minute');
    return latestArrival.diff(departureDatetime, 'minute') > MAX_TRIP_DURATION_MINUTES;
  }, [departureDatetime, destinationDatetime, driverDeviationBudget]);

  // Warn (but don't block) when the arrival time is before the departure time. A negative-span
  // trip corrupts expiry and booking math downstream (nunamnir/subula/OTP), but is surfaced as a
  // warning rather than a hard validation so the driver can still save — matching how the
  // trip-too-long case above is handled.
  const arrivalBeforeDeparture = useMemo(() => {
    if (!departureDatetime?.isValid() || !destinationDatetime?.isValid()) {
      return false;
    }
    return destinationDatetime.isBefore(departureDatetime);
  }, [departureDatetime, destinationDatetime]);

  // The ordered stops the vehicle visits: departure, the (non-cancelled)
  // intermediate stops at their flex-area centroids, destination. Serialised
  // to a string so the routing effect below re-runs only when an actual
  // coordinate changes, not on every render's fresh array identity. Null
  // until both endpoints are placed.
  const routeStopsKey = useMemo(() => {
    if (
      departureLng == null ||
      departureLat == null ||
      destinationLng == null ||
      destinationLat == null
    ) {
      return null;
    }
    const via = (intermediateCalls ?? [])
      .filter(call => !call.cancellation)
      .map(call => loadFeatureFromFlexArea(call.departureStopAssignment?.expectedFlexibleArea))
      .filter(feature => feature !== null)
      .map(feature => feature.geometry.coordinates);
    return JSON.stringify([[departureLng, departureLat], ...via, [destinationLng, destinationLat]]);
  }, [departureLng, departureLat, destinationLng, destinationLat, intermediateCalls]);

  useEffect(() => {
    // The route is fetched whenever both endpoints and the departure are set —
    // even with auto-estimate off — so the driving path can always be drawn on
    // the map. It is routed leg by leg through the intermediate stops, exactly
    // like the booking flow re-times a trip. The arrival field is only written
    // in auto mode (off when editing an existing trip), so a saved arrival is
    // never silently overwritten.
    if (routeStopsKey == null || departureMs == null) {
      // No complete route — clear any stale line from the map.
      onRouteGeometryChange?.(null);
      setEstimatedLegs(0);
      return;
    }
    const stops: Position[] = JSON.parse(routeStopsKey);
    let cancelled = false;
    routeLegChain(stops, dayjs(departureMs).toISOString(), streetRoute)
      .then(chain => {
        if (cancelled) return;
        // A chain always comes back; legs the journey planner would not route
        // are straight lines timed from their distance. Say so, but keep them.
        onRouteGeometryChange?.(chainGeometries(chain));
        setEstimatedLegs(chain.estimatedLegs);
        if (estimateArrivalAutomatically) {
          // Auto mode: always keep the arrival in sync with the route, so it
          // updates whenever a stop or the departure changes. The chained
          // arrival accounts for any intermediate stops along the way.
          setValue('destinationDatetime', dayjs(chain.arrivals[chain.arrivals.length - 1]), {
            shouldValidate: true,
          });
        }
      })
      .catch(() => {
        // routeLegChain absorbs planner failures itself, so this only fires on
        // an unexpected error. Fall back to straight lines on the map.
        if (!cancelled) {
          onRouteGeometryChange?.('failed');
          setEstimatedLegs(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    estimateArrivalAutomatically,
    routeStopsKey,
    departureMs,
    streetRoute,
    setValue,
    onRouteGeometryChange,
  ]);

  const estimatedCalls = tripData?.estimatedVehicleJourney.estimatedCalls?.estimatedCall || [];
  // Capacity is a property of the vehicle, so fall back to the origin's value
  // for stops that don't carry their own capacity.
  const vehicleCapacity = estimatedCalls[0]?.expectedDepartureCapacities?.[0]?.totalCapacity;

  // Display info per stop, matching the booking view: the driver's origin and
  // destination are labelled Departure/Destination; everything in between (the
  // driver's own stops and any passengers' pickup/dropoff) is shown as a
  // neutral, numbered "Intermediate stop N". Marker colours mirror the map:
  // green start, blue intermediate, red destination.
  let intermediateCounter = 0;
  const stopDisplays = estimatedCalls.map((call, index) => {
    const isFirst = index === 0;
    const isLast = index === estimatedCalls.length - 1;
    const latestTime = call.latestExpectedArrivalTime;

    if (isFirst) {
      return {
        color: 'success' as const,
        label: 'Departure',
        name: call.stopPointName,
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Departure' as const,
        latestTime,
      };
    }
    if (isLast) {
      return {
        color: 'error' as const,
        label: 'Destination',
        name: call.stopPointName,
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Arrival' as const,
        latestTime,
      };
    }
    intermediateCounter += 1;
    return {
      color: 'primary' as const,
      label: 'Intermediate stop',
      name: `Intermediate stop ${intermediateCounter}`,
      time:
        call.aimedArrivalTime ||
        call.aimedDepartureTime ||
        call.expectedArrivalTime ||
        call.expectedDepartureTime,
      timeType: 'Stop' as const,
      latestTime,
    };
  });

  // Numbered circle marker matching the markers on the trip map. Greyed when
  // the stop is cancelled.
  const markerColor = (color: 'success' | 'error' | 'primary', cancelled: boolean) =>
    cancelled
      ? '#9e9e9e'
      : color === 'success'
        ? '#4CAF50'
        : color === 'error'
          ? '#f44336'
          : '#2196F3';

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

      {/* How the form fills itself in. Both options only ever write into fields
          the user can still take over by switching the option off, and both are
          off when an existing trip is opened so nothing saved is recomputed. */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Typography variant="subtitle1" component="h2" gutterBottom>
          Form options
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Controller
            name="estimateArrivalAutomatically"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!field.value}
                    onChange={event => field.onChange(event.target.checked)}
                  />
                }
                label="Estimate arrival time automatically"
              />
            )}
          />
          <Controller
            name="setStopNamesAutomatically"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!field.value}
                    onChange={event => field.onChange(event.target.checked)}
                  />
                }
                label="Set stop names automatically"
              />
            )}
          />
          <FormHelperText>
            Stop names are taken from the nearest known place to each stop on the map.
          </FormHelperText>
        </Box>
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
              const stopInfo = stopDisplays[index];
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
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: markerColor(stopInfo.color, cancelled),
                      border: '3px solid white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>
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
                        {stopInfo.name}
                      </Typography>
                      <Chip
                        label={stopInfo.label}
                        size="small"
                        variant="outlined"
                        color={stopInfo.color}
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
                    <StopOccupancy
                      onboardCount={call.expectedDepartureOccupancy?.[0]?.onboardCount}
                      totalCapacity={
                        call.expectedDepartureCapacities?.[0]?.totalCapacity ?? vehicleCapacity
                      }
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={toggleCancellation}
                    aria-label={cancelled ? 'Restore stop' : 'Cancel stop'}
                    title={cancelled ? 'Restore stop' : 'Cancel stop'}
                  >
                    {cancelled ? <Replay fontSize="small" /> : <Cancel fontSize="small" />}
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}
      {/* Most users have access to a single codespace, so showing a single-option
          dropdown is just noise. When there is more than one we render the picker. */}
      {adminCodespaces.length > 1 && (
        <FormControl fullWidth required error={!!errors.dataSource} margin="normal">
          <InputLabel id="datasource-label">Data source</InputLabel>
          <Controller
            name="dataSource"
            control={control}
            render={({ field }) => {
              return (
                <Select
                  {...field}
                  labelId="datasource-label"
                  label="Data source"
                  // The data source is the trip's codespace, which is part of its fixed
                  // identity — it can only be chosen while creating the trip (see isEditing).
                  disabled={isEditing}
                  onChange={event => {
                    field.onChange(event);
                    // The journey code and booking URL are derived from the codespace.
                    // Re-mint them when it changes so the published booking URL
                    // (/book-trip/{codespace}/{code}) and the stored code match the codespace the
                    // trip is actually saved under. This only runs while creating a trip — the
                    // picker is disabled once editing, so the code stays the trip's fixed identity.
                    const newCodespace = String(event.target.value);
                    const newCode = `${newCodespace}:ServiceJourney:${uuidv4()}`;
                    setValue('estimatedVehicleJourneyCode', newCode);
                    setValue(
                      'contactUrl',
                      `${window.location.origin}/book-trip/${newCodespace}/${newCode}`
                    );
                  }}
                >
                  <MenuItem value="" disabled>
                    <em>Data source</em>
                  </MenuItem>
                  {field.value && !adminCodespaces.includes(field.value) && (
                    <MenuItem value={field.value}>{field.value}</MenuItem>
                  )}
                  {adminCodespaces.map(codespace => (
                    <MenuItem key={codespace} value={codespace}>
                      {codespace}
                    </MenuItem>
                  ))}
                </Select>
              );
            }}
          />
          <FormHelperText>
            {isEditing
              ? "A trip's data source (codespace) is fixed once it's created. To use a different one, create a new trip."
              : errors.dataSource?.message}
          </FormHelperText>
        </FormControl>
      )}
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
              label={
                setStopNamesAutomatically
                  ? 'Departure stop name (automatic)'
                  : 'Departure stop name'
              }
              disabled={!!setStopNamesAutomatically}
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
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          disabled={!!departureFlexibleStop || !drawingStopsAllowed}
          onClick={() => onAddDeparturestopClick()}
        >
          Add stop
        </Button>
        <Button
          variant="outlined"
          onClick={onRemoveDepartureStopClick}
          disabled={!departureFlexibleStop}
        >
          Remove stop
        </Button>
        {mapDepartureFlexibleStop?.id && (
          <IconButton
            disabled={!departureFlexibleStop}
            aria-label="Zoom to departure stop"
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
              label={
                setStopNamesAutomatically
                  ? 'Destination stop name (automatic)'
                  : 'Destination stop name'
              }
              disabled={!!setStopNamesAutomatically}
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
              disabled={!!estimateArrivalAutomatically}
              label={
                estimateArrivalAutomatically ? 'Arrival time (estimated)' : 'Select arrival time'
              }
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
      {arrivalBeforeDeparture && (
        <Alert severity="warning">
          The arrival time is before the departure time, so this trip would end before it starts.
        </Alert>
      )}
      {estimatedLegs !== 0 && (
        <Alert severity="warning">
          {estimatedLegs === null
            ? 'Could not fetch the driving route from the journey planner. The map shows straight lines between the stops instead.'
            : `The journey planner could not plan ${estimatedLegs === 1 ? 'one leg' : `${estimatedLegs} legs`} of this trip. ${estimatedLegs === 1 ? 'It is' : 'They are'} drawn as ${estimatedLegs === 1 ? 'a straight line' : 'straight lines'} on the map and timed from the distance between the stops`}
          {estimatedLegs !== null &&
            (estimateArrivalAutomatically ? ', so the arrival time is a rough estimate.' : '.')}
        </Alert>
      )}
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          disabled={!!destinationFlexibleStop || !drawingStopsAllowed}
          onClick={() => onAddDestinationtopClick()}
        >
          Add stop
        </Button>
        <Button
          variant="outlined"
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
      <Typography variant="h6" component="h2">
        Trip details
      </Typography>

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

      {tripExceedsMaxDuration && (
        <Alert severity="warning">
          This trip is longer than 2.5 hours (arrival time plus the deviation budget, minus
          departure time). The journey planner (OTP) rejects trips this long, so it will not be
          bookable — shorten the trip or reduce the deviation budget.
        </Alert>
      )}

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

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Controller
          name="totalCapacity"
          control={control}
          render={({ field }) => {
            return (
              <TextField
                {...field}
                value={field.value ?? ''}
                label="Total capacity"
                error={!!errors.totalCapacity}
                helperText={errors.totalCapacity?.message}
                sx={{ flex: 1, minWidth: 160 }}
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
                sx={{ flex: 1, minWidth: 160 }}
              />
            );
          }}
        />
      </Box>

      {noAdminAccess && (
        <Alert severity="info">
          You don&apos;t have permission to create trips in any of your codespaces.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button type="submit" variant="contained" color="primary" disabled={noAdminAccess}>
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
