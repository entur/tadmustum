import type { Extrajourney } from '../model/Extrajourney.tsx';
import type { EstimatedCall } from '../model/EstimatedCall.tsx';
import type { Position } from 'geojson';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import {
  type LngLat,
  insertStopsByShortestPath,
} from '../../features/passenger-booking/util/shortestPath.tsx';
import loadFeatureFromFlexArea from '../../features/plan-trip/util/loadFeatureFromFlexArea.tsx';
import { routeLegChain, type RouteLeg } from './routeLegChain.tsx';

// Re-exported for callers that pass the street router into the booking
// helpers; the type itself lives with routeLegChain.
export type { RouteLeg };

export interface PassengerBookingData {
  tripId: string;
  pickupCoordinates: [number, number]; // [lng, lat]
  dropoffCoordinates: [number, number]; // [lng, lat]
  pickupTime?: string;
  dropoffTime?: string;
  numberOfPassengers: number;
  passengerDeviationBudget?: number;
}

export async function prepareBookingData(
  originalTrip: Extrajourney,
  bookingData: PassengerBookingData,
  authority: string,
  routeLeg?: RouteLeg
): Promise<{
  codespace: string;
  authority: string;
  input: Extrajourney;
}> {
  // The booking re-submits the trip as an upsert keyed on its
  // estimatedVehicleJourneyCode (nunamnir's storage key, carried along by the
  // spread below), so a trip without one can't be targeted. We no longer echo
  // back the server `id` — nunamnir ignores it now that the code is the identity.
  if (!originalTrip.estimatedVehicleJourney.estimatedVehicleJourneyCode) {
    throw new Error('Original trip must have an estimatedVehicleJourneyCode');
  }

  // Over-capacity bookings are allowed (the UI warns about them), so we don't
  // reject here — occupancy is still computed so every stop reflects the load.
  const assembled = assembleBooking(originalTrip, bookingData);
  const { calls: orderedCalls } = await routeAssembledCalls(assembled, bookingData, routeLeg);

  const updatedTrip: Extrajourney = {
    estimatedVehicleJourney: {
      ...originalTrip.estimatedVehicleJourney,
      recordedAtTime: dayjs().toISOString(),
      estimatedCalls: {
        estimatedCall: renumberCalls(orderedCalls),
      },
    },
  };

  return {
    codespace: assembled.codespace,
    authority,
    input: updatedTrip,
  };
}

// Recompute stop times from real car-driving durations when a router is
// available and every stop has a coordinate, starting at the driver's planned
// departure. A detour for a pickup pushes back every downstream stop, and each
// stop's latestExpectedArrivalTime shifts with it. Without a router (or when a
// stop lacks a coordinate) the assembled estimate is returned unchanged.
// Also yields the routed street geometry per leg (null when not routed), so
// the booking map can draw the actual driving path.
async function routeAssembledCalls(
  assembled: AssembledBooking,
  bookingData: PassengerBookingData,
  routeLeg?: RouteLeg
): Promise<{ calls: EstimatedCall[]; legGeometries: Position[][] | null }> {
  if (routeLeg && assembled.canOrderByPath) {
    return applyRoutedTimes(
      assembled.orderedCalls,
      assembled.coords as LngLat[],
      assembled.originDeparture,
      routeLeg,
      bookingData.passengerDeviationBudget
    );
  }
  return { calls: assembled.orderedCalls, legGeometries: null };
}

export interface BookingRoutePreview {
  calls: EstimatedCall[];
  // stopPointRefs of this booking's own pickup/dropoff, so the UI can label
  // them distinctly from the driver's stops and other passengers' stops.
  pickupStopRef: string;
  dropoffStopRef: string;
  // Index (into `calls`) of the first stop where the running occupancy exceeds
  // capacity, or null if the booking fits. An index — not a name — so the UI
  // can label it with the same text it shows in the route list. Lets the UI
  // flag over-capacity live instead of throwing.
  overCapacityStopIndex: number | null;
  // Routed street geometry per leg of the previewed route (calls[i] ->
  // calls[i+1]), for drawing the actual driving path on the booking map.
  // Null when the preview wasn't routed (sync preview, routing unavailable).
  legGeometries: Position[][] | null;
}

// Synchronous preview of what a booking would do to the trip route: the new
// pickup/dropoff inserted, the stops reordered by shortest path, and occupancy
// recomputed at every stop. Unlike prepareBookingData this does NOT route real
// times and does NOT throw on over-capacity — it reports over-capacity via
// `overCapacityStopName` so the route can update live as the passenger selects
// pickup/dropoff coordinates. Returns null when a preview can't be built.
export function previewBookingRoute(
  originalTrip: Extrajourney,
  bookingData: PassengerBookingData
): BookingRoutePreview | null {
  let assembled: AssembledBooking;
  try {
    assembled = assembleBooking(originalTrip, bookingData);
  } catch {
    return null;
  }
  return {
    calls: renumberCalls(assembled.orderedCalls),
    pickupStopRef: assembled.pickupStopRef,
    dropoffStopRef: assembled.dropoffStopRef,
    overCapacityStopIndex: assembled.exceededAt?.index ?? null,
    legGeometries: null,
  };
}

// Like previewBookingRoute, but re-times every stop with real car-driving
// durations (async). Used by the booking UI so the preview shows the same
// updated times for all stops — not just the new pickup/dropoff — that the
// booking will be saved with. Returns null when a preview can't be built.
export async function routedBookingPreview(
  originalTrip: Extrajourney,
  bookingData: PassengerBookingData,
  routeLeg: RouteLeg
): Promise<BookingRoutePreview | null> {
  let assembled: AssembledBooking;
  try {
    assembled = assembleBooking(originalTrip, bookingData);
  } catch {
    return null;
  }
  const { calls, legGeometries } = await routeAssembledCalls(assembled, bookingData, routeLeg);
  return {
    calls: renumberCalls(calls),
    pickupStopRef: assembled.pickupStopRef,
    dropoffStopRef: assembled.dropoffStopRef,
    overCapacityStopIndex: assembled.exceededAt?.index ?? null,
    legGeometries,
  };
}

interface AssembledBooking {
  codespace: string;
  // Ordered calls with occupancy applied, NOT yet renumbered or re-timed.
  orderedCalls: EstimatedCall[];
  // Map coordinate per call, aligned by index with orderedCalls.
  coords: (LngLat | null)[];
  canOrderByPath: boolean;
  originDeparture: string | undefined;
  exceededAt: ExceededAt;
  pickupStopRef: string;
  dropoffStopRef: string;
}

// Shared synchronous core for booking and preview: validates the trip, builds
// the pickup/dropoff stops, inserts them into the existing sequence, reorders
// by shortest path, and recomputes occupancy. No routing, no throwing on
// over-capacity (reported via the returned `exceededAt`).
function assembleBooking(
  originalTrip: Extrajourney,
  bookingData: PassengerBookingData
): AssembledBooking {
  // Codespace is the prefix of the trip's lineRef (`<CODESPACE>:CarPooling:<uuid>`).
  // It must match the supplied authority — nunamnir enforces this server-side.
  const codespace = originalTrip.estimatedVehicleJourney.lineRef?.split(':')[0];
  if (!codespace) {
    throw new Error('Original trip is missing a lineRef; cannot determine codespace');
  }

  const originalCalls = originalTrip.estimatedVehicleJourney.estimatedCalls.estimatedCall;
  if (originalCalls.length < 2) {
    throw new Error('Original trip must have at least 2 stops');
  }

  const firstCall = originalCalls[0];
  const lastCall = originalCalls[originalCalls.length - 1];

  const firstCallTotalCapacity = firstCall.expectedDepartureCapacities?.[0]?.totalCapacity;

  // Estimated pickup/dropoff times: place pickup 1/3 and dropoff 2/3 into the
  // journey. These are replaced by real routed times in prepareBookingData when
  // a router is available; the preview shows them as estimates.
  const firstDepartureTime = dayjs(firstCall.aimedDepartureTime || firstCall.expectedDepartureTime);
  const lastArrivalTime = dayjs(lastCall.aimedArrivalTime || lastCall.expectedArrivalTime);
  const journeyDurationMs = lastArrivalTime.diff(firstDepartureTime);
  const pickupTime = firstDepartureTime.add(journeyDurationMs / 3, 'milliseconds');
  const dropoffTime = firstDepartureTime.add((journeyDurationMs * 2) / 3, 'milliseconds');

  // Create pickup stop (point location, not flexible area).
  // `order` is assigned when the sequence is renumbered, and occupancy is
  // computed by applyOccupancy — so neither is set here.
  const pickupStop: EstimatedCall = {
    order: 0,
    stopPointRef: `${codespace}:PickupPoint:${uuidv4()}`,
    stopPointName: `Passenger Pickup (${bookingData.pickupCoordinates[1].toFixed(4)}, ${bookingData.pickupCoordinates[0].toFixed(4)})`,
    destinationDisplay: lastCall.destinationDisplay,
    aimedDepartureTime: bookingData.pickupTime || pickupTime.toISOString(),
    expectedDepartureTime: bookingData.pickupTime || pickupTime.toISOString(),
    latestExpectedArrivalTime:
      bookingData.passengerDeviationBudget != null
        ? dayjs(bookingData.pickupTime || pickupTime.toISOString())
            .add(bookingData.passengerDeviationBudget, 'minutes')
            .toISOString()
        : undefined,
    departureBoardingActivity: 'boarding',
    expectedDepartureCapacities:
      firstCallTotalCapacity != null ? [{ totalCapacity: firstCallTotalCapacity }] : undefined,
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

  // Create dropoff stop (point location, not flexible area).
  const dropoffStop: EstimatedCall = {
    order: 0,
    stopPointRef: `${codespace}:DropoffPoint:${uuidv4()}`,
    stopPointName: `Passenger Dropoff (${bookingData.dropoffCoordinates[1].toFixed(4)}, ${bookingData.dropoffCoordinates[0].toFixed(4)})`,
    destinationDisplay: lastCall.destinationDisplay,
    aimedArrivalTime: bookingData.dropoffTime || dropoffTime.toISOString(),
    expectedArrivalTime: bookingData.dropoffTime || dropoffTime.toISOString(),
    latestExpectedArrivalTime:
      bookingData.passengerDeviationBudget != null
        ? dayjs(bookingData.dropoffTime || dropoffTime.toISOString())
            .add(bookingData.passengerDeviationBudget, 'minutes')
            .toISOString()
        : undefined,
    arrivalBoardingActivity: 'alighting',
    expectedDepartureCapacities:
      firstCallTotalCapacity != null ? [{ totalCapacity: firstCallTotalCapacity }] : undefined,
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

  // Preserve every existing call (the driver's intermediate stops and any
  // previously-booked passengers' pickup/dropoff calls) and insert this
  // booking's pickup and dropoff into the sequence. The driver's origin
  // (firstCall) and final destination (lastCall) stay anchored at the ends;
  // the remaining stops are reordered into the shortest path between them —
  // the same ordering the booking map draws — so we can get e.g.
  // origin -> intermediate 1 -> pickup -> intermediate 2 -> dropoff -> destination.
  const middleCalls = originalCalls.slice(1, originalCalls.length - 1);

  // The existing middle stops (the driver's intermediate stops and any earlier
  // passengers' pickup/dropoff) keep their relative order; only this booking's
  // new pickup/dropoff are positioned, at the slots chosen by shortest path
  // (with pickup at or before dropoff).
  const existingMiddle: CallEntry[] = middleCalls.map(call => ({
    call,
    coord: callCoordinate(call),
  }));
  const pickupEntry: CallEntry = { call: pickupStop, coord: bookingData.pickupCoordinates };
  const dropoffEntry: CallEntry = { call: dropoffStop, coord: bookingData.dropoffCoordinates };

  const originCoord = callCoordinate(firstCall);
  const destinationCoord = callCoordinate(lastCall);

  // Only position by shortest path when every stop has a resolvable coordinate;
  // otherwise keep the existing order (intermediates first, then the new
  // pickup/dropoff) so we never drop or misplace calls.
  const canOrderByPath =
    originCoord != null &&
    destinationCoord != null &&
    existingMiddle.every(entry => entry.coord != null) &&
    pickupEntry.coord != null &&
    dropoffEntry.coord != null;

  const orderedMiddle: CallEntry[] = canOrderByPath
    ? insertStopsByShortestPath(
        originCoord,
        destinationCoord,
        existingMiddle.map(entry => ({ item: entry, coord: entry.coord as LngLat })),
        { item: pickupEntry, coord: pickupEntry.coord as LngLat },
        { item: dropoffEntry, coord: dropoffEntry.coord as LngLat }
      )
    : [...existingMiddle, pickupEntry, dropoffEntry];

  const orderedEntries: CallEntry[] = [
    { call: firstCall, coord: originCoord },
    ...orderedMiddle,
    { call: lastCall, coord: destinationCoord },
  ];

  const occupancy = applyOccupancy(
    orderedEntries.map(entry => entry.call),
    originalCalls,
    pickupStop,
    dropoffStop,
    bookingData.numberOfPassengers,
    firstCallTotalCapacity
  );

  return {
    codespace,
    orderedCalls: occupancy.calls,
    coords: orderedEntries.map(entry => entry.coord),
    canOrderByPath,
    originDeparture: firstCall.aimedDepartureTime || firstCall.expectedDepartureTime,
    exceededAt: occupancy.exceededAt,
    pickupStopRef: pickupStop.stopPointRef,
    dropoffStopRef: dropoffStop.stopPointRef,
  };
}

// A call paired with its map coordinate (null when it has no resolvable area).
type CallEntry = { call: EstimatedCall; coord: LngLat | null };

// Index of the first stop whose running occupancy exceeds capacity, plus that
// count. The index is into the ordered calls, so the UI can map it to the same
// label it shows in the route list.
type ExceededAt = { index: number; count: number } | null;

// Renumber `order` sequentially across the whole sequence (1-based).
const renumberCalls = (calls: EstimatedCall[]): EstimatedCall[] =>
  calls.map((call, index) => ({ ...call, order: index + 1 }));

// The representative [lng, lat] of a call, taken from the centroid of its
// flexible area — the same point the booking map uses to draw stops. Returns
// null when the call has no resolvable area.
function callCoordinate(call: EstimatedCall): LngLat | null {
  const feature = loadFeatureFromFlexArea(call.departureStopAssignment?.expectedFlexibleArea);
  return feature ? (feature.geometry.coordinates as LngLat) : null;
}

const onboardOf = (call: EstimatedCall): number | undefined =>
  call.expectedDepartureOccupancy?.[0]?.onboardCount ?? undefined;

const withOnboard = (call: EstimatedCall, onboardCount: number): EstimatedCall => ({
  ...call,
  expectedDepartureOccupancy: [{ onboardCount }],
});

// Recomputes each stop's onboard count by simulating boarding/alighting along
// the (reordered) sequence.
//
// The driver's origin keeps its baseline occupancy. Each existing stop's signed
// delta (how many board/alight there) is reconstructed from the original onboard
// counts — a property of the stop itself, so it survives reordering. The new
// booking adds +numberOfPassengers at its pickup and -numberOfPassengers at its
// dropoff. Walking the new order accumulates the running count onto each stop.
// Capacity is not enforced here — the first over-capacity stop is reported via
// `exceededAt` so callers can either throw (booking) or flag it (preview).
function applyOccupancy(
  orderedCalls: EstimatedCall[],
  originalCalls: EstimatedCall[],
  pickupStop: EstimatedCall,
  dropoffStop: EstimatedCall,
  numberOfPassengers: number,
  totalCapacity?: number | null
): { calls: EstimatedCall[]; exceededAt: ExceededAt } {
  const baseline = onboardOf(originalCalls[0]) ?? 1;

  const deltaByCall = new Map<EstimatedCall, number>();
  let prev = baseline;
  for (let i = 1; i < originalCalls.length; i++) {
    const current = onboardOf(originalCalls[i]) ?? prev;
    deltaByCall.set(originalCalls[i], current - prev);
    prev = current;
  }
  deltaByCall.set(pickupStop, numberOfPassengers);
  deltaByCall.set(dropoffStop, -numberOfPassengers);

  let running = baseline;
  let exceededAt: { index: number; count: number } | null = null;

  const calls = orderedCalls.map((call, index) => {
    if (index === 0) {
      // Origin keeps its baseline occupancy.
      return withOnboard(call, baseline);
    }
    running += deltaByCall.get(call) ?? 0;
    if (totalCapacity != null && running > totalCapacity && exceededAt === null) {
      exceededAt = { index, count: running };
    }
    return withOnboard(call, running);
  });

  return { calls, exceededAt };
}

// Re-times the sequence using real car-driving durations. Routes each leg in
// turn from the driver's departure, accumulating arrival times. Returns the
// calls unchanged (and no geometry) if there is no departure time or any leg
// can't be planned, so a routing hiccup never yields a half-updated schedule
// or a half-drawn route.
async function applyRoutedTimes(
  orderedCalls: EstimatedCall[],
  coords: LngLat[],
  originDeparture: string | undefined,
  routeLeg: RouteLeg,
  passengerDeviationBudget?: number
): Promise<{ calls: EstimatedCall[]; legGeometries: Position[][] | null }> {
  if (!originDeparture) return { calls: orderedCalls, legGeometries: null };

  const chain = await routeLegChain(coords, originDeparture, routeLeg);
  if (!chain) return { calls: orderedCalls, legGeometries: null };
  const { arrivals, legGeometries } = chain;

  const lastIndex = orderedCalls.length - 1;
  const calls = orderedCalls.map((call, index) => {
    if (index === 0) {
      // Origin keeps its planned departure; mirror it onto the expected time.
      return {
        ...call,
        aimedDepartureTime: originDeparture,
        expectedDepartureTime: originDeparture,
      };
    }
    const arrival = arrivals[index];
    const updated: EstimatedCall = {
      ...call,
      aimedArrivalTime: arrival,
      expectedArrivalTime: arrival,
      latestExpectedArrivalTime: shiftLatest(call, arrival, passengerDeviationBudget),
    };
    if (index !== lastIndex) {
      // No dwell: depart as soon as the vehicle arrives.
      updated.aimedDepartureTime = arrival;
      updated.expectedDepartureTime = arrival;
    }
    return updated;
  });
  return { calls, legGeometries };
}

// New latest-arrival deadline for a stop after its scheduled time moved to
// `newTime`. Preserves the stop's existing slack (its old latest minus its old
// scheduled time) when it had one; otherwise applies the booking's deviation
// budget; otherwise leaves it untouched.
function shiftLatest(
  call: EstimatedCall,
  newTime: string,
  fallbackBudgetMinutes?: number
): string | undefined {
  const oldReference =
    call.expectedArrivalTime ||
    call.aimedArrivalTime ||
    call.expectedDepartureTime ||
    call.aimedDepartureTime;
  if (call.latestExpectedArrivalTime && oldReference) {
    const slackMs = dayjs(call.latestExpectedArrivalTime).diff(dayjs(oldReference));
    if (slackMs >= 0) {
      return dayjs(newTime).add(slackMs, 'millisecond').toISOString();
    }
  }
  if (fallbackBudgetMinutes != null) {
    return dayjs(newTime).add(fallbackBudgetMinutes, 'minutes').toISOString();
  }
  return call.latestExpectedArrivalTime;
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
