import { Controller, type Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { Add, Cancel, Replay } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { Position } from 'geojson';
import { useAllowedCodespaces } from '../../../shared/hooks/useAllowedCodespaces.tsx';
import { useStreetRoute } from '../../plan-trip/hooks/useStreetRoute.tsx';
import { routeLegChain, type RouteLegGeometries } from '../../../shared/api/routeLegChain.tsx';
import type { FlexTourBookedStop, FlexTourFormData } from '../model/FlexTourFormData.tsx';
import {
  flexTourDataSchema,
  MAX_TOUR_DURATION_HOURS,
  MINIMUM_BOOKED_STOPS,
  stopsOverlappingDwell,
  tourSpanHours,
} from '../model/flexTourDataSchema.tsx';
import {
  defaultServiceDate,
  isOperatingDay,
  isWithinBookingWindow,
  TRONDHEIM_FLEX_LINE,
} from '../model/trondheimFlexLine.tsx';
import type { StopPlacedHandler } from '../hooks/useFlexTourStops.tsx';

export interface FlexTourDataFormProps {
  onSubmitCallback: (formData: FlexTourFormData) => void;
  onResetCallback: () => void;
  onAddBookedStopClick: (index: number) => void;
  onRemoveStop: (featureId: string | null) => void;
  onZoomToFeature: (id: string) => void;
  onViewTourCallback: () => void;
  drawingStopsAllowed: boolean;
  /** Lets the parent hand completed map draws back to the matching form field. */
  registerStopPlacedHandler: (handler: StopPlacedHandler) => void;
  /** Reports the driving route between the stops so the map can draw it. */
  onRouteGeometryChange?: (legGeometries: RouteLegGeometries) => void;
}

/** A fresh booked stop, timed after the previous one so the tour stays in order by default. */
function newBookedStop(previousTime: Dayjs, onboardCount: number): FlexTourBookedStop {
  return {
    featureId: null,
    position: null,
    stopName: 'Booked stop',
    arrivalDatetime: previousTime.add(15, 'minute'),
    deviationBudget: 15,
    onboardCount,
  };
}

export default function FlexTourDataForm(props: FlexTourDataFormProps) {
  const {
    onSubmitCallback,
    onResetCallback,
    onAddBookedStopClick,
    onRemoveStop,
    onZoomToFeature,
    onViewTourCallback,
    drawingStopsAllowed,
    registerStopPlacedHandler,
    onRouteGeometryChange,
  } = props;

  // The form drives a mutation, so only offer codespaces the user can actually write to —
  // otherwise the rejection only surfaces as a 403 on submit.
  const { adminCodespaces } = useAllowedCodespaces();
  const noAdminAccess = adminCodespaces.length === 0;

  const streetRoute = useStreetRoute();
  const [streetRouteFailed, setStreetRouteFailed] = useState<boolean>(false);

  // Computed once so Reset returns to the same values.
  const defaults = useMemo(() => {
    const serviceDate = defaultServiceDate();
    const tourStart = serviceDate.hour(9).minute(0).second(0).millisecond(0);
    return { serviceDate, tourStart };
  }, []);

  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
    reset,
  } = useForm<FlexTourFormData>({
    // Cast: the schema requires non-null Positions; the form models the pre-validation state
    // where a stop has not been placed on the map yet.
    resolver: yupResolver(flexTourDataSchema) as Resolver<FlexTourFormData>,
    mode: 'onBlur',
    defaultValues: {
      dataSource: '',
      operator: TRONDHEIM_FLEX_LINE.operatorRef,
      serviceJourneyRef: TRONDHEIM_FLEX_LINE.serviceJourneyRef,
      serviceDate: defaults.serviceDate,
      lineRef: TRONDHEIM_FLEX_LINE.lineRef,
      totalCapacity: TRONDHEIM_FLEX_LINE.totalCapacity,
      tourCancellation: false,
      dwellMinutes: 1,
      // Two stops is the minimum a tour can have, so that is what a fresh form offers: the
      // vehicle starts at the first and ends at the last.
      bookedStops: [
        newBookedStop(defaults.tourStart.subtract(15, 'minute'), 2),
        newBookedStop(defaults.tourStart.add(10, 'minute'), 1),
      ],
    },
  });

  const dataSource = watch('dataSource');
  const serviceDate = watch('serviceDate');
  const serviceJourneyRef = watch('serviceJourneyRef');
  const bookedStops = watch('bookedStops');
  const tourCancellation = watch('tourCancellation');
  const totalCapacity = watch('totalCapacity');
  const dwellMinutes = watch('dwellMinutes');

  // Default the data source to the codespace the flex line belongs to when the user has write
  // access to it, since every default id on the form carries that prefix. Otherwise pick the
  // only option there is, and leave the choice to the user when there are several.
  useEffect(() => {
    if (dataSource || adminCodespaces.length === 0) return;
    if (adminCodespaces.includes(TRONDHEIM_FLEX_LINE.codespace)) {
      setValue('dataSource', TRONDHEIM_FLEX_LINE.codespace, { shouldValidate: false });
    } else if (adminCodespaces.length === 1) {
      setValue('dataSource', adminCodespaces[0], { shouldValidate: false });
    }
  }, [dataSource, adminCodespaces, setValue]);

  // Receive map draws into whichever stop asked for them.
  useEffect(() => {
    registerStopPlacedHandler((target, featureId, position) => {
      const stops = getValues('bookedStops');
      const stop = stops[target.index];
      if (!stop) return;
      if (stop.featureId && stop.featureId !== featureId) onRemoveStop(stop.featureId);
      const updated = stops.map((s, i) => (i === target.index ? { ...s, featureId, position } : s));
      setValue('bookedStops', updated, { shouldValidate: true });
    });
  }, [registerStopPlacedHandler, setValue, getValues, onRemoveStop]);

  // The stop coordinates in visit order, as a stable string so the routing effect only refires
  // when a position actually moves — a fresh array every render would loop.
  const routeStopsKey = useMemo(() => {
    const placed = (bookedStops ?? []).map(stop => stop.position).filter(p => p !== null);
    if (placed.length < 2) return null;
    return JSON.stringify(placed);
  }, [bookedStops]);
  const firstArrivalMs = bookedStops?.[0]?.arrivalDatetime?.isValid?.()
    ? bookedStops[0].arrivalDatetime.valueOf()
    : null;

  useEffect(() => {
    // Route the tour leg by leg so the map can draw the path the vehicle actually drives, the
    // same way the carpool trip form does. Departure is the first stop's arrival: routing only
    // needs a clock to plan against, and the tour's own times are what the user is editing.
    if (routeStopsKey == null || firstArrivalMs == null) {
      onRouteGeometryChange?.(null);
      setStreetRouteFailed(false);
      return;
    }
    const stops: Position[] = JSON.parse(routeStopsKey);
    let cancelled = false;
    routeLegChain(stops, dayjs(firstArrivalMs).toISOString(), streetRoute)
      .then(chain => {
        if (cancelled) return;
        if (!chain) {
          onRouteGeometryChange?.('failed');
          setStreetRouteFailed(true);
          return;
        }
        onRouteGeometryChange?.(chain.legGeometries);
        setStreetRouteFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          onRouteGeometryChange?.('failed');
          setStreetRouteFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [routeStopsKey, firstArrivalMs, streetRoute, onRouteGeometryChange]);

  // Every id the payload carries must sit in the tour's data source — nunamnir rejects a
  // mismatch outright, so say so before the user submits. A prefix check, not a derivation:
  // the data source is the user's choice, never computed from a reference.
  const codespaceMismatch =
    !!dataSource && !!serviceJourneyRef && !serviceJourneyRef.startsWith(`${dataSource}:`);

  const notAnOperatingDay = serviceDate?.isValid?.() && !isOperatingDay(serviceDate);
  const firstStop = bookedStops?.[0];
  const lastStop = bookedStops?.[bookedStops.length - 1];
  const spanHours = tourSpanHours(bookedStops, dwellMinutes);
  const dwellOverlaps = stopsOverlappingDwell(bookedStops, dwellMinutes);
  const outsideBookingWindow =
    (firstStop?.arrivalDatetime?.isValid?.() &&
      !isWithinBookingWindow(firstStop.arrivalDatetime)) ||
    (lastStop?.arrivalDatetime?.isValid?.() && !isWithinBookingWindow(lastStop.arrivalDatetime));

  const addBookedStop = () => {
    const stops = getValues('bookedStops');
    const previousTime = stops[stops.length - 1]?.arrivalDatetime ?? defaults.tourStart;
    const onboard = stops[stops.length - 1]?.onboardCount ?? 1;
    setValue('bookedStops', [...stops, newBookedStop(previousTime, onboard)], {
      shouldValidate: false,
    });
  };

  const removeBookedStop = (index: number) => {
    const stops = getValues('bookedStops');
    onRemoveStop(stops[index]?.featureId ?? null);
    setValue(
      'bookedStops',
      stops.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  };

  const handleReset = () => {
    getValues('bookedStops').forEach(stop => onRemoveStop(stop.featureId));
    reset();
    onResetCallback();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmitCallback)}>
      <Stack spacing={2}>
        <Typography variant="h6">Flex tour</Typography>
        <Typography variant="body2" color="text.secondary">
          A booked tour for one flexible ServiceJourney on one service date: the passenger stops the
          vehicle has already committed to, in visit order. OTP inserts new passengers into this
          tour only when every stop's deviation budget tolerates the delay.
        </Typography>

        {noAdminAccess && (
          <Alert severity="warning">
            You have no codespace with write access, so this tour cannot be saved.
          </Alert>
        )}

        <Divider />
        <Typography variant="subtitle2">Which journey</Typography>

        <Controller
          name="dataSource"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.dataSource}>
              <InputLabel id="flex-datasource-label">Data source</InputLabel>
              <Select {...field} labelId="flex-datasource-label" label="Data source">
                {/* An out-of-list value (a tour minted under a codespace the user has since
                    lost) still renders instead of blanking the field. */}
                {field.value && !adminCodespaces.includes(field.value) && (
                  <MenuItem value={field.value}>{field.value}</MenuItem>
                )}
                {adminCodespaces.map(codespace => (
                  <MenuItem key={codespace} value={codespace}>
                    {codespace}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.dataSource?.message ?? 'The codespace the tour is written under.'}
              </FormHelperText>
            </FormControl>
          )}
        />

        <Controller
          name="operator"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Operator"
              error={!!errors.operator}
              // Free text: the line's real operator comes from its own NeTEx
              // (Trondheim_flex is NOG:Operator:…), not from anything this app
              // could look up — the journey-planner operator list is gone with
              // the authority concept.
              helperText={errors.operator?.message ?? 'Required by SIRI.'}
            />
          )}
        />

        <Controller
          name="serviceJourneyRef"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="ServiceJourney"
              fullWidth
              error={!!errors.serviceJourneyRef}
              helperText={
                errors.serviceJourneyRef?.message ??
                `Defaults to the ${TRONDHEIM_FLEX_LINE.lineName} test line.`
              }
            />
          )}
        />

        <Controller
          name="lineRef"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Line"
              fullWidth
              error={!!errors.lineRef}
              helperText={errors.lineRef?.message}
            />
          )}
        />

        <Controller
          name="serviceDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              {...field}
              label="Service date"
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.serviceDate,
                  helperText: errors.serviceDate?.message,
                },
              }}
            />
          )}
        />

        {codespaceMismatch && (
          <Alert severity="error">
            The ServiceJourney <strong>{serviceJourneyRef}</strong> is not in codespace{' '}
            <strong>{dataSource}</strong>. nunamnir rejects this pair — pick the data source the
            journey belongs to.
          </Alert>
        )}

        {/* Warnings, not hard validation: tadmustum is a testing tool, and a tour that OTP will
            skip is sometimes exactly what you want to send. */}
        {notAnOperatingDay && (
          <Alert severity="warning">
            {TRONDHEIM_FLEX_LINE.lineName} runs Mon–Fri between {TRONDHEIM_FLEX_LINE.validFrom} and{' '}
            {TRONDHEIM_FLEX_LINE.validTo}. OTP will skip a tour on a date the journey does not run.
          </Alert>
        )}
        {outsideBookingWindow && (
          <Alert severity="warning">
            The line's booking window is {TRONDHEIM_FLEX_LINE.earliestDeparture}–
            {TRONDHEIM_FLEX_LINE.latestArrival}. OTP enforces the static NeTEx window, so insertions
            outside it will be refused.
          </Alert>
        )}

        <Divider />
        <Typography variant="subtitle2">Vehicle</Typography>

        <Controller
          name="totalCapacity"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Total capacity"
              type="number"
              fullWidth
              error={!!errors.totalCapacity}
              helperText={
                errors.totalCapacity?.message ??
                "Send this explicitly — OTP's default of 5 is car-sized, not bus-sized."
              }
            />
          )}
        />

        <Controller
          name="dwellMinutes"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Dwell at each stop (minutes)"
              type="number"
              fullWidth
              error={!!errors.dwellMinutes}
              helperText={errors.dwellMinutes?.message ?? 'Departure time = arrival + dwell.'}
            />
          )}
        />

        <Divider />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Booked stops ({bookedStops?.length ?? 0})</Typography>
          <Button size="small" startIcon={<Add />} onClick={addBookedStop}>
            Add stop
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          In visit order: the vehicle starts at the first stop and ends at the last, so a tour needs
          at least {MINIMUM_BOOKED_STOPS}. Each stop's deviation budget is the slack it has left —
          OTP refuses an insertion that would push any stop past it.
        </Typography>
        {typeof errors.bookedStops?.message === 'string' && (
          <FormHelperText error>{errors.bookedStops.message}</FormHelperText>
        )}

        {(bookedStops ?? []).map((stop, index) => (
          <Box key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="body2" fontWeight={600}>
                    {index + 1}. Stop
                  </Typography>
                  {/* Which end of the tour a stop is at follows from its position in the list,
                      so it is a hint rather than a field of its own. */}
                  {index === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      tour starts here
                    </Typography>
                  )}
                  {index === (bookedStops?.length ?? 0) - 1 && (
                    <Typography variant="caption" color="text.secondary">
                      tour ends here
                    </Typography>
                  )}
                </Stack>
                <IconButton
                  size="small"
                  aria-label={`Remove stop ${index + 1}`}
                  onClick={() => removeBookedStop(index)}
                  disabled={(bookedStops?.length ?? 0) <= MINIMUM_BOOKED_STOPS}
                  title={
                    (bookedStops?.length ?? 0) <= MINIMUM_BOOKED_STOPS
                      ? `A tour needs at least ${MINIMUM_BOOKED_STOPS} stops`
                      : undefined
                  }
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Stack>

              <Controller
                name={`bookedStops.${index}.stopName`}
                control={control}
                render={({ field }) => <TextField {...field} label="Name" size="small" fullWidth />}
              />

              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onAddBookedStopClick(index)}
                  disabled={!drawingStopsAllowed}
                  startIcon={<GpsFixedIcon />}
                >
                  {stop.position ? 'Move' : 'Place on map'}
                </Button>
                {stop.position && (
                  <Chip
                    label={`${stop.position[1].toFixed(4)}, ${stop.position[0].toFixed(4)}`}
                    onClick={() => stop.featureId && onZoomToFeature(stop.featureId)}
                    size="small"
                  />
                )}
              </Stack>
              {!stop.position && <FormHelperText error>Place this stop on the map.</FormHelperText>}

              <Controller
                name={`bookedStops.${index}.arrivalDatetime`}
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    {...field}
                    label="Expected arrival"
                    ampm={false}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                )}
              />

              <Stack direction="row" spacing={1}>
                <Controller
                  name={`bookedStops.${index}.deviationBudget`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Deviation budget (min)"
                      type="number"
                      size="small"
                      fullWidth
                    />
                  )}
                />
                <Controller
                  name={`bookedStops.${index}.onboardCount`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Onboard (incl. driver)"
                      type="number"
                      size="small"
                      fullWidth
                    />
                  )}
                />
              </Stack>
            </Stack>
          </Box>
        ))}

        {typeof totalCapacity === 'number' &&
          (bookedStops ?? []).some(s => s.onboardCount > totalCapacity) && (
            <Alert severity="warning">
              A stop reports more passengers on board than the vehicle's total capacity, so OTP will
              find no room for an insertion there.
            </Alert>
          )}

        {dwellOverlaps.length > 0 && (
          <Alert severity="warning">
            Stop {dwellOverlaps.map(i => i + 1).join(', ')} arrives before the previous stop's dwell
            of {dwellMinutes} min is over. Every call but the last is sent a departure of arrival +
            dwell, and OTP rejects calls whose times do not increase.
          </Alert>
        )}
        {streetRouteFailed && (
          <Alert severity="info">
            The journey planner could not route between these stops, so the map shows straight lines
            instead of the driving path.
          </Alert>
        )}

        {spanHours !== null && spanHours <= 0 && (
          <Alert severity="warning">
            The tour ends before it starts — OTP rejects a tour whose end time is not after its
            start.
          </Alert>
        )}
        {spanHours !== null && spanHours > MAX_TOUR_DURATION_HOURS && (
          <Alert severity="warning">
            The tour spans {spanHours.toFixed(1)} h, over OTP's {MAX_TOUR_DURATION_HOURS} h limit;
            OTP will reject it outright.
          </Alert>
        )}

        <Divider />

        <Controller
          name="tourCancellation"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={!!field.value} />}
              label="Cancel this tour"
            />
          )}
        />
        {tourCancellation && (
          <Alert severity="info">
            Cancelling removes the stored tour in OTP, so the line falls back to its static NeTEx
            behaviour.
          </Alert>
        )}

        <Alert severity="info">
          The tour spans{' '}
          {lastStop?.arrivalDatetime?.isValid?.() && firstStop?.arrivalDatetime?.isValid?.()
            ? `${lastStop.arrivalDatetime.diff(firstStop.arrivalDatetime, 'minute')} min`
            : '—'}
          ; OTP rejects anything over {MAX_TOUR_DURATION_HOURS} h. Journey code will be{' '}
          <code>
            {serviceJourneyRef}:
            {serviceDate?.isValid?.() ? serviceDate.format('YYYY-MM-DD') : 'YYYY-MM-DD'}
          </code>
          .
        </Alert>

        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={noAdminAccess}>
            Save tour
          </Button>
          <Button variant="outlined" onClick={onViewTourCallback}>
            View on map
          </Button>
          <Button variant="text" startIcon={<Replay />} onClick={handleReset}>
            Reset
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
