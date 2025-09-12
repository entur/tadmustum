import type { Extrajourney } from '../model/Extrajourney.tsx';
import type { EstimatedCall } from '../model/EstimatedCall.tsx';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

export interface PassengerBookingData {
  tripId: string;
  pickupCoordinates: [number, number]; // [lng, lat]
  dropoffCoordinates: [number, number]; // [lng, lat]
  pickupTime?: string;
  dropoffTime?: string;
}

export function prepareBookingData(
  originalTrip: Extrajourney,
  bookingData: PassengerBookingData
): {
  codespace: string;
  authority: string;
  input: Extrajourney;
} {
  if (!originalTrip.id) {
    throw new Error('Original trip must have an ID');
  }

  const originalCalls = originalTrip.estimatedVehicleJourney.estimatedCalls.estimatedCall;

  if (originalCalls.length < 2) {
    throw new Error('Original trip must have at least 2 stops');
  }

  const firstCall = originalCalls[0];
  const lastCall = originalCalls[originalCalls.length - 1];

  // Calculate estimated times for pickup and dropoff based on original trip times
  const firstDepartureTime = dayjs(firstCall.aimedDepartureTime || firstCall.expectedDepartureTime);
  const lastArrivalTime = dayjs(lastCall.aimedArrivalTime || lastCall.expectedArrivalTime);

  // For simplicity, place passenger pickup 1/3 into the journey and dropoff 2/3 into the journey
  const journeyDurationMs = lastArrivalTime.diff(firstDepartureTime);
  const pickupTime = firstDepartureTime.add(journeyDurationMs / 3, 'milliseconds');
  const dropoffTime = firstDepartureTime.add((journeyDurationMs * 2) / 3, 'milliseconds');

  // Create pickup stop (point location, not flexible area)
  const pickupStop: EstimatedCall = {
    order: 2, // Between first (1) and last stop
    stopPointRef: `ENT:PickupPoint:${uuidv4()}`,
    stopPointName: `Passenger Pickup (${bookingData.pickupCoordinates[1].toFixed(4)}, ${bookingData.pickupCoordinates[0].toFixed(4)})`,
    destinationDisplay: lastCall.destinationDisplay,
    aimedDepartureTime: bookingData.pickupTime || pickupTime.toISOString(),
    expectedDepartureTime: bookingData.pickupTime || pickupTime.toISOString(),
    departureBoardingActivity: 'boarding',
    departureStopAssignment: {
      // For point stops, we can either omit expectedFlexibleArea or provide a very small area
      // For now, let's create a minimal area around the point
      expectedFlexibleArea: {
        polygon: {
          exterior: {
            posList: createPointPolygon(bookingData.pickupCoordinates),
          },
        },
      },
    },
  };

  // Create dropoff stop (point location, not flexible area)
  const dropoffStop: EstimatedCall = {
    order: 3, // After pickup but before final destination
    stopPointRef: `ENT:DropoffPoint:${uuidv4()}`,
    stopPointName: `Passenger Dropoff (${bookingData.dropoffCoordinates[1].toFixed(4)}, ${bookingData.dropoffCoordinates[0].toFixed(4)})`,
    destinationDisplay: lastCall.destinationDisplay,
    aimedArrivalTime: bookingData.dropoffTime || dropoffTime.toISOString(),
    expectedArrivalTime: bookingData.dropoffTime || dropoffTime.toISOString(),
    arrivalBoardingActivity: 'alighting',
    departureStopAssignment: {
      expectedFlexibleArea: {
        polygon: {
          exterior: {
            posList: createPointPolygon(bookingData.dropoffCoordinates),
          },
        },
      },
    },
  };

  // Update the last stop's order
  const updatedLastCall = {
    ...lastCall,
    order: 4,
  };

  // Create the updated estimated calls array
  const updatedEstimatedCalls = [
    firstCall, // Order 1 - original departure
    pickupStop, // Order 2 - passenger pickup
    dropoffStop, // Order 3 - passenger dropoff
    updatedLastCall, // Order 4 - original destination
  ];

  // Create the updated trip
  const updatedTrip: Extrajourney = {
    id: originalTrip.id,
    estimatedVehicleJourney: {
      ...originalTrip.estimatedVehicleJourney,
      recordedAtTime: dayjs().toISOString(),
      estimatedCalls: {
        estimatedCall: updatedEstimatedCalls,
      },
    },
  };

  return {
    codespace: 'ENT', // Using the same codespace as original trip creation
    authority: 'ENT:Authority:ENT', // Using the same authority as original trip creation
    input: updatedTrip,
  };
}

// Helper function to create a small polygon around a point for SIRI compliance
// Creates a small square (approximately 50m x 50m) around the coordinates
function createPointPolygon([lng, lat]: [number, number]): string {
  // Approximate degree offsets for ~25m in each direction
  const latOffset = 0.000225; // ~25m at mid-latitudes
  const lngOffset = 0.0003; // ~25m at mid-latitudes (varies by latitude)

  // Create a small square around the point
  const coordinates = [
    [lng - lngOffset, lat - latOffset], // Bottom-left
    [lng + lngOffset, lat - latOffset], // Bottom-right
    [lng + lngOffset, lat + latOffset], // Top-right
    [lng - lngOffset, lat + latOffset], // Top-left
    [lng - lngOffset, lat - latOffset], // Close the polygon
  ];

  // Convert to SIRI posList format (space-separated coordinates)
  return coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(' ');
}

export default prepareBookingData;
