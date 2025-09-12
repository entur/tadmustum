import { useState, useEffect } from 'react';
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
import { useParams } from 'react-router-dom';
import { DirectionsCar, LocationOn, Schedule } from '@mui/icons-material';
import type { Extrajourney } from '../../shared/model/Extrajourney';
import { useQueryExtraJourney } from '../plan-trip/hooks/useQueryOneExtraJourney';

interface PassengerBookingFormData {
  origin: string;
  destination: string;
  estimatedPickupTime?: string;
  estimatedDropoffTime?: string;
}

export default function PassengerTripBooking() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Extrajourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<PassengerBookingFormData>({
    origin: '',
    destination: '',
  });
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);

  const queryExtraJourney = useQueryExtraJourney();

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
  }, [tripId]);

  const handleInputChange =
    (field: keyof PassengerBookingFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setBookingData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
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

  const handleBookRide = () => {
    calculateEstimatedTimes();
    setIsBookingConfirmed(true);
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

  const estimatedCalls = trip.estimatedVehicleJourney.estimatedCalls?.estimatedCall;
  const departureCall = estimatedCalls?.[0];
  const arrivalCall = estimatedCalls?.[estimatedCalls.length - 1];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Book a Ride
      </Typography>

      {/* Trip Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <DirectionsCar color="primary" />
              <Typography variant="h6">{trip.estimatedVehicleJourney.publishedLineName}</Typography>
              <Chip
                label={trip.estimatedVehicleJourney.vehicleMode}
                size="small"
                variant="outlined"
              />
            </Box>

            <Typography color="text.secondary" gutterBottom>
              {departureCall?.destinationDisplay}
            </Typography>

            <Divider />

            {/* Route Information */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Trip Route
              </Typography>
              <Stack spacing={2}>
                {departureCall && (
                  <Box display="flex" alignItems="center" gap={2}>
                    <LocationOn color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {departureCall.stopPointName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Departure: {departureCall.aimedDepartureTime}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {arrivalCall && (
                  <Box display="flex" alignItems="center" gap={2}>
                    <LocationOn color="error" />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {arrivalCall.stopPointName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Arrival: {arrivalCall.aimedArrivalTime}
                      </Typography>
                    </Box>
                  </Box>
                )}
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
                  Ride booking confirmed! You will be contacted with pickup details.
                </Typography>
              </Alert>
            )}

            <Box display="flex" gap={2}>
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
                disabled={!bookingData.origin || !bookingData.destination || isBookingConfirmed}
                sx={{ minWidth: 120 }}
              >
                {isBookingConfirmed ? 'Booked' : 'Book Ride'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
