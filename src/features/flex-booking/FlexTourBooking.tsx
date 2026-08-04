import { useCallback, useEffect, useMemo, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import { Clear, FiberManualRecord, FmdGood, LocationOn } from '@mui/icons-material';
import type { Position } from 'geojson';
import type { Extrajourney } from '../../shared/model/Extrajourney.tsx';
import StopOccupancy from '../../shared/components/StopOccupancy.tsx';
import { routeLegChain, type RouteLegGeometries } from '../../shared/api/routeLegChain.tsx';
import loadFeatureFromFlexArea from '../plan-trip/util/loadFeatureFromFlexArea.tsx';
import {
  routedBookingPreview,
  type BookingRoutePreview,
} from '../../shared/api/prepareBookingData.tsx';
import { useQueryExtraJourney } from '../plan-trip/hooks/useQueryOneExtraJourney.tsx';
import { useStreetRoute } from '../plan-trip/hooks/useStreetRoute.tsx';
import PassengerBookingMap from '../passenger-booking/components/PassengerBookingMap.tsx';
import { useBookPassengerRide } from '../passenger-booking/hooks/useBookPassengerRide.tsx';
import { userFacingMessage } from '../../shared/error-message/userFacingMessage.tsx';
import { useAllowedCodespaces } from '../../shared/hooks/useAllowedCodespaces.tsx';
import { slackMinutes, slackViolations, tourDwellMinutes } from './util/deviationBudget.tsx';

/**
 * Books a passenger onto a flex vehicle's already-booked tour.
 *
 * The link that lands here is minted by the flex tour form and travels with the tour as SIRI
 * `PublicContact/Url`, so OTP reports it as the flex leg's booking URL. The page is the flex
 * counterpart of the carpool booking page and works the same way — pick a pickup and a dropoff, see
 * the tour re-timed around them, then write it back with `createOrUpdateExtrajourney`.
 *
 * What differs is the constraint that decides the booking. A carpool trip warns about capacity; a
 * booked flex tour also carries a deviation budget per stop, and OTP refuses an insertion that
 * would push any stop past its `latestExpectedArrivalTime`. That slack is shown per stop and
 * warned about when the insertion would break it.
 */
export default function FlexTourBooking() {
  const { codespace, journeyCode } = useParams<{ codespace: string; journeyCode: string }>();
  const { allowedCodespaces } = useAllowedCodespaces();
  // Booking writes the tour back, so it needs admin on the codespace. Surface that up front
  // rather than letting the form be filled in and then 403 on submit.
  const canBook =
    !!codespace &&
    !!allowedCodespaces
      .find(c => c.id === codespace)
      ?.permissions.includes('ADMIN_CARPOOLING_DATA');

  const [searchParams, setSearchParams] = useSearchParams();
  const [tour, setTour] = useState<Extrajourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickup, setPickup] = useState<[number, number] | undefined>(undefined);
  const [dropoff, setDropoff] = useState<[number, number] | undefined>(undefined);
  const [numberOfPassengers, setNumberOfPassengers] = useState(1);
  const [passengerDeviationBudget, setPassengerDeviationBudget] = useState(5);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [preview, setPreview] = useState<BookingRoutePreview | null>(null);
  const [routePending, setRoutePending] = useState(false);
  const [tourLegGeometries, setTourLegGeometries] = useState<RouteLegGeometries>(null);

  const queryExtraJourney = useQueryExtraJourney();
  const bookPassengerRide = useBookPassengerRide();
  const getStreetRoute = useStreetRoute();

  const tourCalls = useMemo(
    () => tour?.estimatedVehicleJourney.estimatedCalls?.estimatedCall ?? [],
    [tour]
  );
  // Recovered from the tour rather than configured here: re-timing without it would collapse
  // every dwell to zero and quietly change the tour the driver planned.
  const dwellMinutes = useMemo(() => tourDwellMinutes(tourCalls), [tourCalls]);

  useEffect(() => {
    if (!journeyCode) return;
    queryExtraJourney(journeyCode)
      .then(response => {
        if (response.error) {
          setError('Failed to load the flex tour');
        } else {
          setTour(response.data?.extraJourney ?? null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load the flex tour');
        setLoading(false);
      });
  }, [journeyCode, queryExtraJourney]);

  // The tour's own driving route, drawn until a booking preview replaces it.
  useEffect(() => {
    if (tourCalls.length < 2) {
      setTourLegGeometries(null);
      return;
    }
    const coords = tourCalls.map(
      call =>
        loadFeatureFromFlexArea(call.departureStopAssignment?.expectedFlexibleArea)?.geometry
          .coordinates ?? null
    );
    const ready = tourCalls[0]?.aimedArrivalTime || tourCalls[0]?.aimedDepartureTime;
    if (coords.some(coord => coord == null) || !ready) {
      setTourLegGeometries('failed');
      return;
    }
    let cancelled = false;
    routeLegChain(coords as Position[], ready, getStreetRoute, dwellMinutes)
      .then(chain => {
        if (!cancelled) setTourLegGeometries(chain ? chain.legGeometries : 'failed');
      })
      .catch(() => {
        if (!cancelled) setTourLegGeometries('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [tourCalls, getStreetRoute, dwellMinutes]);

  // Coordinate round-tripping through the URL, using the same parameter names and `lat,lng`
  // format OTP's booking links carry, so a link from the journey planner opens here ready to book.
  const parseCoordinate = (param: string | null): [number, number] | undefined => {
    if (!param) return undefined;
    const parts = param.split(',');
    if (parts.length !== 2) return undefined;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return undefined;
    }
    return [lng, lat];
  };

  const writeCoordinatesToUrl = useCallback(
    (from?: [number, number], to?: [number, number]) => {
      const params = new URLSearchParams(searchParams);
      const format = (coords: [number, number]) =>
        `${coords[1].toFixed(6)},${coords[0].toFixed(6)}`;
      if (from) params.set('from_coordinate', format(from));
      else params.delete('from_coordinate');
      if (to) params.set('to_coordinate', format(to));
      else params.delete('to_coordinate');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const from = parseCoordinate(searchParams.get('from_coordinate'));
    const to = parseCoordinate(searchParams.get('to_coordinate'));
    if (from) setPickup(from);
    if (to) setDropoff(to);
  }, [searchParams]);

  // Debounced routed preview, so the tour is re-timed once per settled selection rather than on
  // every map click. The previous preview stays on screen meanwhile.
  useEffect(() => {
    if (!tour || !pickup || !dropoff) {
      setPreview(null);
      setRoutePending(false);
      return;
    }
    const code = tour.estimatedVehicleJourney.estimatedVehicleJourneyCode;
    if (!code) return;
    setRoutePending(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      routedBookingPreview(
        tour,
        {
          tripId: code,
          pickupCoordinates: pickup,
          dropoffCoordinates: dropoff,
          numberOfPassengers,
          passengerDeviationBudget,
          dwellMinutes,
        },
        getStreetRoute
      )
        .then(result => {
          if (!cancelled) {
            setPreview(result);
            setRoutePending(false);
          }
        })
        .catch(() => {
          if (!cancelled) setRoutePending(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    tour,
    pickup,
    dropoff,
    numberOfPassengers,
    passengerDeviationBudget,
    dwellMinutes,
    getStreetRoute,
  ]);

  const handleBook = async () => {
    const code = tour?.estimatedVehicleJourney.estimatedVehicleJourneyCode;
    if (!tour || !pickup || !dropoff) {
      setBookingError('Select both a pickup and a dropoff first');
      return;
    }
    if (!code) {
      setBookingError('This tour has no EstimatedVehicleJourneyCode, so it cannot be updated');
      return;
    }
    setBookingInProgress(true);
    setBookingError(null);
    try {
      const result = await bookPassengerRide(tour, {
        tripId: code,
        pickupCoordinates: pickup,
        dropoffCoordinates: dropoff,
        numberOfPassengers,
        passengerDeviationBudget,
        dwellMinutes,
      });
      if (result.error) {
        setBookingError(
          userFacingMessage(result.error, 'Could not complete the booking. Please try again.')
        );
      } else {
        setBooked(true);
      }
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading flex tour…</Typography>
      </Box>
    );
  }

  if (error || !tour) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Alert severity="error">{error || `No flex tour found for ${journeyCode}`}</Alert>
      </Box>
    );
  }

  const displayedCalls = preview?.calls ?? tourCalls;
  const violations = preview ? slackViolations(preview.calls, tourCalls) : [];
  const vehicleCapacity = displayedCalls[0]?.expectedDepartureCapacities?.[0]?.totalCapacity;
  const overCapacityIndex = preview?.overCapacityStopIndex ?? null;
  const legGeometries: RouteLegGeometries = preview
    ? (preview.legGeometries ?? 'failed')
    : tourLegGeometries;

  // Label each previewed call: this booking's own pickup/dropoff get pins, the tour's own stops
  // keep a number by their position in the tour.
  let stopNumber = 0;
  const rows = displayedCalls.map(call => {
    if (preview && call.stopPointRef === preview.pickupStopRef) {
      return { icon: LocationOn, color: 'success' as const, number: null, label: 'Your pickup' };
    }
    if (preview && call.stopPointRef === preview.dropoffStopRef) {
      return { icon: FmdGood, color: 'error' as const, number: null, label: 'Your dropoff' };
    }
    stopNumber += 1;
    return {
      icon: FiberManualRecord,
      color: 'primary' as const,
      number: stopNumber as number | null,
      label: 'Booked stop',
    };
  });

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Book a flex ride
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 1, minWidth: { md: '400px' } }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AirportShuttleIcon color="primary" />
                  <Typography variant="h6">
                    {tour.estimatedVehicleJourney.publishedLineName || 'Flex tour'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {tour.estimatedVehicleJourney.framedVehicleJourneyRef?.datedVehicleJourneyRef}
                  {' · '}
                  {tour.estimatedVehicleJourney.framedVehicleJourneyRef?.dataFrameRef}
                  {dwellMinutes > 0 && ` · ${dwellMinutes} min dwell per stop`}
                </Typography>

                <Divider />

                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" color="primary">
                    Tour ({displayedCalls.length} stops)
                    {preview && ' — preview with your stops'}
                  </Typography>
                  {routePending && (
                    <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                      <CircularProgress size={14} aria-label="Updating route" />
                      <Typography variant="caption">updating route…</Typography>
                    </Box>
                  )}
                </Box>

                {violations.length > 0 && (
                  <Alert severity="warning">
                    This booking pushes{' '}
                    {violations.map(v => `stop ${v.index + 1} ${v.overrunMinutes} min`).join(', ')}{' '}
                    past the slack it has left. The journey planner refuses an insertion that breaks
                    a booked stop&apos;s deviation budget, so it would reject this tour — you can
                    still save it.
                  </Alert>
                )}
                {overCapacityIndex != null && (
                  <Alert severity="warning">
                    This booking puts the vehicle over capacity from stop {overCapacityIndex + 1}{' '}
                    onward.
                  </Alert>
                )}

                <Stack spacing={2}>
                  {displayedCalls.map((call, index) => {
                    const row = rows[index];
                    const slack = slackMinutes(call);
                    const time =
                      call.expectedArrivalTime ||
                      call.aimedArrivalTime ||
                      call.expectedDepartureTime ||
                      call.aimedDepartureTime;
                    const violated = violations.some(v => v.index === index);
                    return (
                      <Box
                        key={call.stopPointRef || index}
                        display="flex"
                        alignItems="center"
                        gap={2}
                      >
                        <row.icon color={row.color} sx={{ fontSize: 24 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={500}>
                              {row.number != null ? `${row.number}. ` : ''}
                              {call.stopPointName}
                            </Typography>
                            <Chip
                              label={row.label}
                              size="small"
                              variant="outlined"
                              color={row.color}
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          </Box>
                          {time && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Arrival: {new Date(time).toLocaleString()}
                              {slack != null && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  color={violated ? 'error' : 'text.secondary'}
                                >
                                  {' '}
                                  ({slack} min slack left)
                                </Typography>
                              )}
                            </Typography>
                          )}
                          <StopOccupancy
                            onboardCount={call.expectedDepartureOccupancy?.[0]?.onboardCount}
                            totalCapacity={
                              call.expectedDepartureCapacities?.[0]?.totalCapacity ??
                              vehicleCapacity
                            }
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your journey details
              </Typography>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Your pickup coordinates"
                  value={pickup ? `${pickup[1].toFixed(6)}, ${pickup[0].toFixed(6)}` : ''}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="Pick it on the map"
                />
                <TextField
                  fullWidth
                  label="Your dropoff coordinates"
                  value={dropoff ? `${dropoff[1].toFixed(6)}, ${dropoff[0].toFixed(6)}` : ''}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="Pick it on the map"
                />
                <TextField
                  fullWidth
                  label="Number of passengers"
                  type="number"
                  value={numberOfPassengers}
                  onChange={e => setNumberOfPassengers(Math.max(1, parseInt(e.target.value) || 1))}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
                <TextField
                  fullWidth
                  label="Your deviation budget (minutes)"
                  type="number"
                  value={passengerDeviationBudget}
                  onChange={e =>
                    setPassengerDeviationBudget(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                />

                {booked && (
                  <Alert severity="success">
                    Booking saved. The tour now carries your pickup and dropoff — the journey
                    planner picks it up on its next poll.
                  </Alert>
                )}
                {bookingError && <Alert severity="error">Booking failed: {bookingError}</Alert>}
                {!canBook && (
                  <Alert severity="info">
                    You don&apos;t have permission to book rides in this codespace.
                  </Alert>
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={handleBook}
                    disabled={!canBook || !pickup || !dropoff || booked || bookingInProgress}
                    sx={{ minWidth: 120 }}
                  >
                    {bookingInProgress ? 'Booking…' : booked ? 'Booked' : 'Book ride'}
                  </Button>
                  {(pickup || dropoff) && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<Clear />}
                      onClick={() => {
                        setPickup(undefined);
                        setDropoff(undefined);
                        writeCoordinatesToUrl(undefined, undefined);
                      }}
                      disabled={booked}
                    >
                      Clear pickup &amp; dropoff
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: { md: '400px' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tour route &amp; location selection
              </Typography>
              {legGeometries === 'failed' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Could not fetch the driving route from the journey planner. The map shows straight
                  lines between the stops instead, and the stop times are rough estimates.
                </Alert>
              )}
              <PassengerBookingMap
                trip={tour}
                routeCalls={displayedCalls}
                legGeometries={legGeometries}
                onPickupLocationSelect={coords => {
                  setPickup(coords);
                  writeCoordinatesToUrl(coords, dropoff);
                }}
                onDropoffLocationSelect={coords => {
                  setDropoff(coords);
                  writeCoordinatesToUrl(pickup, coords);
                }}
                pickupLocation={pickup}
                dropoffLocation={dropoff}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
