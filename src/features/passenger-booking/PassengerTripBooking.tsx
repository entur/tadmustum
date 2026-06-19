import { useState, useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Divider,
  Alert,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  DirectionsCar,
  Share,
  Clear,
  LocationOn,
  FmdGood,
  FiberManualRecord,
  type SvgIconComponent,
} from '@mui/icons-material';
import type { Extrajourney } from '../../shared/model/Extrajourney';
import type { Position } from 'geojson';
import StopOccupancy from '../../shared/components/StopOccupancy';
import { routeLegChain, type RouteLegGeometries } from '../../shared/api/routeLegChain';
import loadFeatureFromFlexArea from '../plan-trip/util/loadFeatureFromFlexArea';
import {
  routedBookingPreview,
  type BookingRoutePreview,
} from '../../shared/api/prepareBookingData';
import { useQueryExtraJourney } from '../plan-trip/hooks/useQueryOneExtraJourney';
import { useStreetRoute } from '../plan-trip/hooks/useStreetRoute';
import PassengerBookingMap from './components/PassengerBookingMap';
import { useBookPassengerRide } from './hooks/useBookPassengerRide';
import { userFacingMessage } from '../../shared/error-message/userFacingMessage.tsx';
import { useAuthorities } from '../../shared/hooks/useAuthorities';

interface PassengerBookingFormData {
  origin: string;
  destination: string;
  numberOfPassengers: number;
  passengerDeviationBudget: number;
  pickupCoordinates?: [number, number];
  dropoffCoordinates?: [number, number];
}

// A stop marker matching the booking map: a numbered coloured circle for the
// trip's own stops, or the map's pickup/dropoff pin (no number) for this
// booking's pickup and dropoff.
function StopMarker({
  markerNumber,
  icon: Icon,
  color,
  size = 24,
}: {
  markerNumber: number | null;
  icon: SvgIconComponent;
  color: 'success' | 'error' | 'primary';
  size?: number;
}) {
  if (markerNumber == null) {
    return <Icon color={color} sx={{ fontSize: size }} />;
  }
  const background = color === 'success' ? '#4CAF50' : color === 'error' ? '#f44336' : '#2196F3';
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: background,
        border: '3px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {markerNumber}
    </Box>
  );
}

export default function PassengerTripBooking() {
  const { codespace, tripId } = useParams<{ codespace: string; tripId: string }>();
  const { authorities, allowedCodespaces } = useAuthorities();
  const tripAuthority = codespace
    ? authorities.find(a => a.id.startsWith(`${codespace}:`))
    : undefined;
  // Booking writes the trip back, so requires adminCarpoolingData on the
  // codespace — surface that as a disabled button rather than letting the
  // user fill in the form and hit a 403 on submit.
  const canBook =
    !!codespace &&
    !!allowedCodespaces
      .find(c => c.id === codespace)
      ?.permissions.includes('ADMIN_CARPOOLING_DATA');
  const [searchParams, setSearchParams] = useSearchParams();
  const [trip, setTrip] = useState<Extrajourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<PassengerBookingFormData>({
    origin: '',
    destination: '',
    numberOfPassengers: 1,
    passengerDeviationBudget: 5,
  });
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);

  const queryExtraJourney = useQueryExtraJourney();
  const bookPassengerRide = useBookPassengerRide();
  const getStreetRoute = useStreetRoute();

  // The route preview comes from real OTP routing (async). `routePending` is
  // true while a fresh route is being computed; we keep the previous result
  // visible meanwhile so the times update once instead of flickering.
  const [routedPreview, setRoutedPreview] = useState<BookingRoutePreview | null>(null);
  const [routePending, setRoutePending] = useState(false);

  // The driving route of the trip as planned (origin -> intermediate stops ->
  // destination), shown on the map before a booking preview exists — i.e.
  // before the passenger has selected both pickup and dropoff. Null while
  // routing (nothing drawn), 'failed' when it can't be routed (the map shows
  // its straight-line fallback).
  const [tripLegGeometries, setTripLegGeometries] = useState<RouteLegGeometries>(null);

  useEffect(() => {
    if (!trip) {
      setTripLegGeometries(null);
      return;
    }
    const calls = trip.estimatedVehicleJourney.estimatedCalls?.estimatedCall ?? [];
    const coords = calls.map(
      call =>
        loadFeatureFromFlexArea(call.departureStopAssignment?.expectedFlexibleArea)?.geometry
          .coordinates ?? null
    );
    const departure = calls[0]?.aimedDepartureTime || calls[0]?.expectedDepartureTime;
    // A stop without a resolvable coordinate can't be routed (or drawn as a
    // partial route) — show the straight-line fallback.
    if (coords.length < 2 || coords.some(coord => coord == null) || !departure) {
      setTripLegGeometries('failed');
      return;
    }
    let cancelled = false;
    routeLegChain(coords as Position[], departure, getStreetRoute)
      .then(chain => {
        if (!cancelled) setTripLegGeometries(chain ? chain.legGeometries : 'failed');
      })
      .catch(() => {
        if (!cancelled) setTripLegGeometries('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [trip, getStreetRoute]);

  // Parse coordinates from URL parameters
  const parseCoordinatesFromURL = (param: string | null): [number, number] | undefined => {
    if (!param) return undefined;

    const coords = param.split(',');
    if (coords.length === 2) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);

      // Validate coordinates
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lng, lat]; // Return as [longitude, latitude]
      }
    }
    return undefined;
  };

  // Update URL parameters when coordinates change. Parameter names and value
  // format (`lat,lng` with 6-decimal precision) match what OpenTripPlanner's
  // carpooling module appends to the booking URL so the same link round-trips
  // between OTP-generated and app-shared URLs.
  const formatCoordinate = (coords: [number, number]) =>
    `${coords[1].toFixed(6)},${coords[0].toFixed(6)}`;

  const updateURLParams = (pickup?: [number, number], dropoff?: [number, number]) => {
    const newParams = new URLSearchParams(searchParams);

    if (pickup) {
      newParams.set('from_coordinate', formatCoordinate(pickup));
    } else {
      newParams.delete('from_coordinate');
    }

    if (dropoff) {
      newParams.set('to_coordinate', formatCoordinate(dropoff));
    } else {
      newParams.delete('to_coordinate');
    }

    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    if (!tripId || !codespace || !tripAuthority) return;

    queryExtraJourney(codespace, tripAuthority.id, tripId)
      .then(response => {
        if (response.error) {
          setError('Failed to load trip details');
        } else {
          setTrip(response.data?.extraJourney || null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load trip details');
        setLoading(false);
      });
  }, [codespace, tripAuthority, tripId, queryExtraJourney]);

  // Initialize form with URL parameters
  useEffect(() => {
    const pickupParam = searchParams.get('from_coordinate');
    const dropoffParam = searchParams.get('to_coordinate');

    const pickupCoords = parseCoordinatesFromURL(pickupParam);
    const dropoffCoords = parseCoordinatesFromURL(dropoffParam);

    if (pickupCoords || dropoffCoords) {
      setBookingData(prev => ({
        ...prev,
        pickupCoordinates: pickupCoords,
        dropoffCoordinates: dropoffCoords,
        origin: pickupCoords
          ? `${pickupCoords[1].toFixed(6)}, ${pickupCoords[0].toFixed(6)}`
          : prev.origin,
        destination: dropoffCoords
          ? `${dropoffCoords[1].toFixed(6)}, ${dropoffCoords[0].toFixed(6)}`
          : prev.destination,
      }));
    }
  }, [searchParams]);

  const handleInputChange =
    (field: keyof PassengerBookingFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setBookingData(prev => {
        const updated = { ...prev, [field]: event.target.value };

        // If user manually edits the text field, clear the corresponding coordinates
        if (field === 'origin' && updated.pickupCoordinates) {
          updated.pickupCoordinates = undefined;
          updateURLParams(undefined, updated.dropoffCoordinates);
        } else if (field === 'destination' && updated.dropoffCoordinates) {
          updated.dropoffCoordinates = undefined;
          updateURLParams(updated.pickupCoordinates, undefined);
        }

        return updated;
      });
    };

  const handlePickupLocationSelect = (coordinates: [number, number], address?: string) => {
    const newBookingData = {
      pickupCoordinates: coordinates,
      origin: address || `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`,
    };

    setBookingData(prev => {
      const updated = { ...prev, ...newBookingData };
      // Update URL with new coordinates
      updateURLParams(updated.pickupCoordinates, updated.dropoffCoordinates);
      return updated;
    });
  };

  const handleDropoffLocationSelect = (coordinates: [number, number], address?: string) => {
    const newBookingData = {
      dropoffCoordinates: coordinates,
      destination: address || `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`,
    };

    setBookingData(prev => {
      const updated = { ...prev, ...newBookingData };
      // Update URL with new coordinates
      updateURLParams(updated.pickupCoordinates, updated.dropoffCoordinates);
      return updated;
    });
  };

  const handleClearLocations = () => {
    setBookingData(prev => ({
      ...prev,
      pickupCoordinates: undefined,
      dropoffCoordinates: undefined,
      origin: '',
      destination: '',
    }));
    updateURLParams(undefined, undefined);
  };

  const handleBookRide = async () => {
    if (!trip || !bookingData.pickupCoordinates || !bookingData.dropoffCoordinates) {
      setBookingError('Please select both pickup and dropoff locations');
      return;
    }

    if (!trip.id) {
      setBookingError('Trip ID is missing');
      return;
    }

    if (!tripAuthority) {
      setBookingError('Could not resolve the authority for this trip');
      return;
    }

    setIsBookingInProgress(true);
    setBookingError(null);

    try {
      const bookingPayload = {
        tripId: trip.id,
        pickupCoordinates: bookingData.pickupCoordinates,
        dropoffCoordinates: bookingData.dropoffCoordinates,
        numberOfPassengers: bookingData.numberOfPassengers,
        passengerDeviationBudget: bookingData.passengerDeviationBudget,
      };

      const result = await bookPassengerRide(trip, bookingPayload, tripAuthority.id);

      if (result.error) {
        setBookingError(
          userFacingMessage(result.error, 'Could not complete the booking. Please try again.')
        );
      } else {
        setIsBookingConfirmed(true);
      }
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsBookingInProgress(false);
    }
  };

  // Share current URL with coordinates
  const handleShareURL = async () => {
    const currentURL = window.location.href;

    if (navigator.share && bookingData.pickupCoordinates && bookingData.dropoffCoordinates) {
      try {
        await navigator.share({
          title: 'Car Pooling Trip Booking',
          text: `Book a ride on ${trip?.estimatedVehicleJourney.publishedLineName}`,
          url: currentURL,
        });
      } finally {
        // Fallback to clipboard if share fails
        copyToClipboard(currentURL);
      }
    } else {
      // Fallback to clipboard
      copyToClipboard(currentURL);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Build the route preview from real OTP routing (no rough synchronous
  // estimate — that made stop times flicker as the passenger nudged the
  // pickup). Debounced so we don't route on every map click. We keep the last
  // routed result on screen while the next one computes, so the times update
  // once when OTP responds instead of jumping to a placeholder first.
  useEffect(() => {
    const pickupCoordinates = bookingData.pickupCoordinates;
    const dropoffCoordinates = bookingData.dropoffCoordinates;
    if (!trip?.id || !pickupCoordinates || !dropoffCoordinates) {
      setRoutedPreview(null);
      setRoutePending(false);
      return;
    }
    setRoutePending(true);
    const tripId = trip.id;
    let cancelled = false;
    const timer = setTimeout(() => {
      routedBookingPreview(
        trip,
        {
          tripId,
          pickupCoordinates,
          dropoffCoordinates,
          numberOfPassengers: bookingData.numberOfPassengers,
          passengerDeviationBudget: bookingData.passengerDeviationBudget,
        },
        getStreetRoute
      )
        .then(preview => {
          if (!cancelled) {
            setRoutedPreview(preview);
            setRoutePending(false);
          }
        })
        .catch(() => {
          // Routing failed — keep the last routed result on screen.
          if (!cancelled) setRoutePending(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    trip,
    bookingData.pickupCoordinates,
    bookingData.dropoffCoordinates,
    bookingData.numberOfPassengers,
    bookingData.passengerDeviationBudget,
    getStreetRoute,
  ]);

  const activePreview = routedPreview;

  // What the map should draw: the preview's routed path when a preview
  // exists ('failed' when it couldn't be routed), otherwise the trip's own
  // routed path. 'failed' also drives the routing warning below.
  const displayedLegGeometries: RouteLegGeometries = activePreview
    ? (activePreview.legGeometries ?? 'failed')
    : tripLegGeometries;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading trip details...</Typography>
      </Box>
    );
  }

  if (error || !trip) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Alert severity="error">{error || 'Trip not found'}</Alert>
      </Box>
    );
  }

  // Show the live preview (with the prospective pickup/dropoff) when available,
  // otherwise the trip's current stops.
  const estimatedCalls =
    activePreview?.calls ?? trip.estimatedVehicleJourney.estimatedCalls?.estimatedCall ?? [];
  const isPreview = activePreview != null;
  // Capacity is a property of the vehicle, so fall back to the origin's value
  // for stops that don't carry their own capacity.
  const vehicleCapacity = estimatedCalls[0]?.expectedDepartureCapacities?.[0]?.totalCapacity;

  // Build the display info for each stop. This booking's own pickup and dropoff
  // (identified by stopPointRef from the preview) get the map's pickup/dropoff
  // pins and no number. Every other stop is one of the trip's own stops and
  // keeps a numbered circle — numbered by its original position in the trip,
  // ignoring the inserted pickup/dropoff — exactly matching the map's markers.
  const currentPickupRef = activePreview?.pickupStopRef;
  const currentDropoffRef = activePreview?.dropoffStopRef;
  let stopNumber = 0; // trip-stop position, shown on the marker (origin = 1)
  let intermediateCounter = 0; // counts only intermediate stops, for their names
  const stopDisplays = estimatedCalls.map((call, index) => {
    const isFirst = index === 0;
    const isLast = index === estimatedCalls.length - 1;
    const latestTime = call.latestExpectedArrivalTime;

    if (currentPickupRef && call.stopPointRef === currentPickupRef) {
      return {
        icon: LocationOn,
        color: 'success' as const,
        markerNumber: null as number | null,
        label: 'Your pickup',
        warningLabel: 'Your pickup',
        name: call.stopPointName,
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Pickup' as const,
        latestTime,
      };
    }
    if (currentDropoffRef && call.stopPointRef === currentDropoffRef) {
      return {
        icon: FmdGood,
        color: 'error' as const,
        markerNumber: null as number | null,
        label: 'Your dropoff',
        warningLabel: 'Your dropoff',
        name: call.stopPointName,
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Dropoff' as const,
        latestTime,
      };
    }

    // A trip stop — keep its original number (pickup/dropoff don't count).
    stopNumber += 1;
    if (isFirst) {
      return {
        icon: FiberManualRecord,
        color: 'success' as const,
        markerNumber: stopNumber as number | null,
        label: 'Departure',
        warningLabel: call.stopPointName,
        name: call.stopPointName,
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Departure' as const,
        latestTime,
      };
    }
    if (isLast) {
      return {
        icon: FiberManualRecord,
        color: 'error' as const,
        markerNumber: stopNumber as number | null,
        label: 'Destination',
        warningLabel: call.stopPointName,
        name: call.stopPointName,
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Arrival' as const,
        latestTime,
      };
    }
    intermediateCounter += 1;
    return {
      icon: FiberManualRecord,
      color: 'primary' as const,
      markerNumber: stopNumber as number | null,
      label: 'Intermediate stop',
      warningLabel: `Intermediate stop ${intermediateCounter}`,
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

  // The first over-capacity stop, taken from the same display info the route
  // list uses, so the warning can show its icon + label (e.g. the pickup pin +
  // "Your pickup") instead of a raw SIRI name.
  const overCapacityStop =
    activePreview?.overCapacityStopIndex != null
      ? stopDisplays[activePreview.overCapacityStopIndex]
      : null;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Book a Ride
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Left Column - Trip Info and Booking Form */}
        <Box sx={{ flex: 1, minWidth: { md: '400px' } }}>
          {/* Trip Information Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <DirectionsCar color="primary" />
                  <Typography variant="h6">
                    {estimatedCalls[0]?.stopPointName} →{' '}
                    {estimatedCalls[estimatedCalls.length - 1]?.stopPointName}
                  </Typography>
                </Box>

                <Divider />

                {/* Route Information - All Stops */}
                <Box>
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="primary">
                      Trip Route ({estimatedCalls.length} stops)
                      {isPreview && ' — preview with your stops'}
                    </Typography>
                    {routePending && (
                      <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                        <CircularProgress size={14} aria-label="Updating route" />
                        <Typography variant="caption">updating route…</Typography>
                      </Box>
                    )}
                  </Box>
                  {overCapacityStop && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
                      >
                        Heads up: this booking puts the vehicle over capacity from
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <StopMarker
                            markerNumber={overCapacityStop.markerNumber}
                            icon={overCapacityStop.icon}
                            color={overCapacityStop.color}
                            size={20}
                          />
                          <strong>{overCapacityStop.warningLabel}</strong>
                        </Box>
                        onward — you can still book, but the car will be overfull.
                      </Box>
                    </Alert>
                  )}
                  <Stack spacing={2}>
                    {estimatedCalls.map((call, index) => {
                      const stopInfo = stopDisplays[index];

                      return (
                        <Box key={call.order || index} display="flex" alignItems="center" gap={2}>
                          <StopMarker
                            markerNumber={stopInfo.markerNumber}
                            icon={stopInfo.icon}
                            color={stopInfo.color}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight={500}>
                                {stopInfo.name}
                              </Typography>
                              <Chip
                                label={stopInfo.label}
                                size="small"
                                variant="outlined"
                                color={stopInfo.color}
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            </Box>
                            {stopInfo.time && (
                              <Typography variant="caption" color="text.secondary">
                                {stopInfo.timeType}: {new Date(stopInfo.time).toLocaleString()}
                                {stopInfo.latestTime && (
                                  <>
                                    {' '}
                                    (latest: {new Date(stopInfo.latestTime).toLocaleTimeString()})
                                  </>
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
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Passenger Booking Form */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your Journey Details
              </Typography>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Your Pickup Coordinates"
                  placeholder="Enter pickup address or location"
                  value={bookingData.origin}
                  onChange={handleInputChange('origin')}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Your Dropoff Coordinates"
                  placeholder="Enter drop-off address or location"
                  value={bookingData.destination}
                  onChange={handleInputChange('destination')}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Number of passengers"
                  type="number"
                  value={bookingData.numberOfPassengers}
                  onChange={e =>
                    setBookingData(prev => ({
                      ...prev,
                      numberOfPassengers: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Passenger deviation budget (minutes)"
                  type="number"
                  value={bookingData.passengerDeviationBudget}
                  onChange={e =>
                    setBookingData(prev => ({
                      ...prev,
                      passengerDeviationBudget: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  variant="outlined"
                />

                {isBookingConfirmed && (
                  <Alert severity="success">
                    <Typography variant="body2">
                      Ride booking confirmed! The trip has been updated with your pickup and dropoff
                      locations.
                    </Typography>
                  </Alert>
                )}

                {bookingError && (
                  <Alert severity="error">
                    <Typography variant="body2">Booking failed: {bookingError}</Typography>
                  </Alert>
                )}

                {!canBook && (
                  <Alert severity="info">
                    <Typography variant="body2">
                      You don&apos;t have permission to book rides in this codespace.
                    </Typography>
                  </Alert>
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={handleBookRide}
                    disabled={
                      !canBook ||
                      !bookingData.pickupCoordinates ||
                      !bookingData.dropoffCoordinates ||
                      isBookingConfirmed ||
                      isBookingInProgress
                    }
                    sx={{ minWidth: 120 }}
                  >
                    {isBookingInProgress
                      ? 'Booking...'
                      : isBookingConfirmed
                        ? 'Booked'
                        : 'Book Ride'}
                  </Button>
                  {(bookingData.pickupCoordinates || bookingData.dropoffCoordinates) && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<Clear />}
                      onClick={handleClearLocations}
                      disabled={isBookingConfirmed}
                    >
                      Clear pickup & dropoff
                    </Button>
                  )}
                  {bookingData.pickupCoordinates && bookingData.dropoffCoordinates && (
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={handleShareURL}
                      sx={{ minWidth: 120 }}
                    >
                      Share Trip
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Right Column - Interactive Map */}
        <Box sx={{ flex: 1, minWidth: { md: '400px' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trip Route & Location Selection
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View the trip route and click the buttons below to select your pickup and drop-off
                locations on the map.
              </Typography>
              {displayedLegGeometries === 'failed' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Could not fetch the driving route from the journey planner. The map shows straight
                  lines between the stops instead, and stop times may be rough estimates.
                </Alert>
              )}
              <PassengerBookingMap
                trip={trip}
                routeCalls={estimatedCalls}
                legGeometries={displayedLegGeometries}
                onPickupLocationSelect={handlePickupLocationSelect}
                onDropoffLocationSelect={handleDropoffLocationSelect}
                pickupLocation={bookingData.pickupCoordinates}
                dropoffLocation={bookingData.dropoffCoordinates}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
