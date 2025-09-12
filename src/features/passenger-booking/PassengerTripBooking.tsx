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
} from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  DirectionsCar,
  LocationOn,
  Schedule,
  Share,
  PersonPin,
  Hail,
  SensorsOff,
} from '@mui/icons-material';
import type { Extrajourney } from '../../shared/model/Extrajourney';
import { useQueryExtraJourney } from '../plan-trip/hooks/useQueryOneExtraJourney';
import PassengerBookingMap from './components/PassengerBookingMap';
import { useBookPassengerRide } from './hooks/useBookPassengerRide';

interface PassengerBookingFormData {
  origin: string;
  destination: string;
  pickupCoordinates?: [number, number];
  dropoffCoordinates?: [number, number];
  estimatedPickupTime?: string;
  estimatedDropoffTime?: string;
}

export default function PassengerTripBooking() {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trip, setTrip] = useState<Extrajourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<PassengerBookingFormData>({
    origin: '',
    destination: '',
  });
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);

  const queryExtraJourney = useQueryExtraJourney();
  const bookPassengerRide = useBookPassengerRide();

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

  // Update URL parameters when coordinates change
  const updateURLParams = (pickup?: [number, number], dropoff?: [number, number]) => {
    const newParams = new URLSearchParams(searchParams);

    if (pickup) {
      newParams.set('pickup', `${pickup[1]},${pickup[0]}`); // Store as lat,lng in URL
    } else {
      newParams.delete('pickup');
    }

    if (dropoff) {
      newParams.set('dropoff', `${dropoff[1]},${dropoff[0]}`); // Store as lat,lng in URL
    } else {
      newParams.delete('dropoff');
    }

    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    if (!tripId) return;

    queryExtraJourney('ENT', 'ENT:Authority:ENT', tripId)
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
  }, [tripId, queryExtraJourney]);

  // Initialize form with URL parameters
  useEffect(() => {
    const pickupParam = searchParams.get('pickup');
    const dropoffParam = searchParams.get('dropoff');

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

  const calculateEstimatedTimes = () => {
    if (!trip || !bookingData.origin || !bookingData.destination) return;

    const estimatedCalls = trip.estimatedVehicleJourney.estimatedCalls?.estimatedCall;
    if (!estimatedCalls || estimatedCalls.length < 2) return;

    const departureTime = estimatedCalls[0].aimedDepartureTime;
    const arrivalTime = estimatedCalls[estimatedCalls.length - 1].aimedArrivalTime;

    setBookingData(prev => ({
      ...prev,
      estimatedPickupTime: departureTime,
      estimatedDropoffTime: arrivalTime,
    }));
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

    setIsBookingInProgress(true);
    setBookingError(null);

    try {
      const bookingPayload = {
        tripId: trip.id,
        pickupCoordinates: bookingData.pickupCoordinates,
        dropoffCoordinates: bookingData.dropoffCoordinates,
        pickupTime: bookingData.estimatedPickupTime,
        dropoffTime: bookingData.estimatedDropoffTime,
      };

      const result = await bookPassengerRide(trip, bookingPayload);

      if (result.error) {
        setBookingError(result.error.message);
      } else {
        // Calculate times and confirm booking
        calculateEstimatedTimes();
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

  const estimatedCalls = trip.estimatedVehicleJourney.estimatedCalls?.estimatedCall || [];

  // Helper function to determine stop type and get appropriate icon/color
  const getStopTypeInfo = (call: (typeof estimatedCalls)[0], index: number) => {
    const isFirst = index === 0;
    const isLast = index === estimatedCalls.length - 1;
    const isPickup =
      call.stopPointName?.includes('Pickup') ||
      (call.departureBoardingActivity === 'boarding' && !isFirst);
    const isDropoff =
      call.stopPointName?.includes('Dropoff') ||
      (call.arrivalBoardingActivity === 'alighting' && !isLast);

    if (isFirst) {
      return {
        icon: LocationOn,
        color: 'success' as const,
        label: 'Departure',
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Departure' as const,
      };
    } else if (isLast) {
      return {
        icon: LocationOn,
        color: 'error' as const,
        label: 'Destination',
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Arrival' as const,
      };
    } else if (isPickup) {
      return {
        icon: PersonPin,
        color: 'primary' as const,
        label: 'Passenger Pickup',
        time: call.aimedDepartureTime || call.expectedDepartureTime,
        timeType: 'Pickup' as const,
      };
    } else if (isDropoff) {
      return {
        icon: Hail,
        color: 'secondary' as const,
        label: 'Passenger Dropoff',
        time: call.aimedArrivalTime || call.expectedArrivalTime,
        timeType: 'Dropoff' as const,
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
      };
    }
  };

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
                    {trip.estimatedVehicleJourney.publishedLineName}
                  </Typography>
                  <Chip
                    label={trip.estimatedVehicleJourney.vehicleMode}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography color="text.secondary" gutterBottom>
                  {estimatedCalls[estimatedCalls.length - 1]?.destinationDisplay}
                </Typography>

                <Divider />

                {/* Route Information - All Stops */}
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Trip Route ({estimatedCalls.length} stops)
                  </Typography>
                  <Stack spacing={2}>
                    {estimatedCalls.map((call, index) => {
                      const stopInfo = getStopTypeInfo(call, index);
                      const IconComponent = stopInfo.icon;

                      return (
                        <Box key={call.order || index} display="flex" alignItems="center" gap={2}>
                          <IconComponent color={stopInfo.color} />
                          <Box sx={{ flex: 1 }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight={500}>
                                {call.stopPointName}
                              </Typography>
                              <Chip
                                label={stopInfo.label}
                                size="small"
                                variant="outlined"
                                color={stopInfo.color === 'action' ? 'default' : stopInfo.color}
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            </Box>
                            {stopInfo.time && (
                              <Typography variant="caption" color="text.secondary">
                                {stopInfo.timeType}: {new Date(stopInfo.time).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ minWidth: '40px' }}
                          >
                            #{call.order}
                          </Typography>
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
                  label="Your Origin Location"
                  placeholder="Enter pickup address or location"
                  value={bookingData.origin}
                  onChange={handleInputChange('origin')}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Your Destination Location"
                  placeholder="Enter drop-off address or location"
                  value={bookingData.destination}
                  onChange={handleInputChange('destination')}
                  variant="outlined"
                />

                {/* Estimated Times Display */}
                {bookingData.estimatedPickupTime && bookingData.estimatedDropoffTime && (
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Estimated Times
                    </Typography>
                    <Stack spacing={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Schedule fontSize="small" />
                        <Typography variant="body2">
                          Pickup: {new Date(bookingData.estimatedPickupTime).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Schedule fontSize="small" />
                        <Typography variant="body2">
                          Drop-off: {new Date(bookingData.estimatedDropoffTime).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}

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

                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    onClick={calculateEstimatedTimes}
                    disabled={!bookingData.origin || !bookingData.destination}
                  >
                    Calculate Times
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleBookRide}
                    disabled={
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
              {(searchParams.has('pickup') || searchParams.has('dropoff')) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    📍 Locations have been pre-selected from the shared URL
                  </Typography>
                </Alert>
              )}
              <PassengerBookingMap
                trip={trip}
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
