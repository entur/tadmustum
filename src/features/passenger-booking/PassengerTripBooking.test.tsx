import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Extrajourney } from '../../shared/model/Extrajourney';
import { renderWithRouter } from '../../test/renderWithRouter';
import PassengerTripBooking from './PassengerTripBooking';

const queryExtraJourney = vi.fn();
const bookPassengerRide = vi.fn();

vi.mock('../plan-trip/hooks/useQueryOneExtraJourney', () => ({
  useQueryExtraJourney: () => queryExtraJourney,
}));

vi.mock('./hooks/useBookPassengerRide', () => ({
  useBookPassengerRide: () => bookPassengerRide,
}));

// The routed-preview effect calls the street router after a debounce; stub it
// so tests don't hit the network. Returning null makes the routed preview fall
// back to the synchronous estimate (which is what the route list shows).
vi.mock('../plan-trip/hooks/useStreetRoute', () => ({
  useStreetRoute: () => async () => null,
}));

// The component looks up the trip's authority via the codespace from the URL.
// Provide a matching entry so the trip query and booking submission proceed.
vi.mock('../../shared/hooks/useAuthorities', () => ({
  useAuthorities: () => ({
    authorities: [{ id: 'ENT:Authority:ENT', name: 'Entur' }],
    allowedCodespaces: [{ id: 'ENT', permissions: ['ADMIN_CARPOOLING_DATA'] }],
  }),
}));

// Stub the map: replace it with two buttons that invoke the location-select callbacks.
// This keeps the test off of maplibre/GL while still exercising the props contract.
vi.mock('./components/PassengerBookingMap', () => ({
  default: ({
    onPickupLocationSelect,
    onDropoffLocationSelect,
  }: {
    onPickupLocationSelect?: (coords: [number, number]) => void;
    onDropoffLocationSelect?: (coords: [number, number]) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onPickupLocationSelect?.([10.7522, 59.9139])}>
        stub-select-pickup
      </button>
      <button type="button" onClick={() => onDropoffLocationSelect?.([5.3221, 60.3913])}>
        stub-select-dropoff
      </button>
    </div>
  ),
}));

const trip: Extrajourney = {
  id: 'ENT:ServiceJourney:1',
  estimatedVehicleJourney: {
    recordedAtTime: '2026-05-20T09:00:00.000Z',
    lineRef: 'ENT:CarPooling:trip-1',
    publishedLineName: 'Carpooling trip ENT:Authority:ENT',
    vehicleMode: 'bus',
    estimatedCalls: {
      estimatedCall: [
        {
          order: 1,
          stopPointName: 'Oslo S',
          destinationDisplay: 'Bergen',
          aimedDepartureTime: '2026-06-01T09:00:00.000Z',
        },
        {
          order: 2,
          stopPointName: 'Bergen stasjon',
          destinationDisplay: 'Bergen',
          aimedArrivalTime: '2026-06-01T15:00:00.000Z',
        },
      ],
    },
  },
} as unknown as Extrajourney;

// Trip with an origin capacity/occupancy so over-capacity can be exercised.
const tripWithCapacity = {
  id: 'ENT:ServiceJourney:1',
  estimatedVehicleJourney: {
    recordedAtTime: '2026-05-20T09:00:00.000Z',
    lineRef: 'ENT:CarPooling:trip-1',
    publishedLineName: 'Carpooling trip ENT:Authority:ENT',
    vehicleMode: 'bus',
    estimatedCalls: {
      estimatedCall: [
        {
          order: 1,
          stopPointName: 'Oslo S',
          destinationDisplay: 'Bergen',
          aimedDepartureTime: '2026-06-01T09:00:00.000Z',
          expectedDepartureOccupancy: [{ onboardCount: 1 }],
          expectedDepartureCapacities: [{ totalCapacity: 4 }],
        },
        {
          order: 2,
          stopPointName: 'Bergen stasjon',
          destinationDisplay: 'Bergen',
          aimedArrivalTime: '2026-06-01T15:00:00.000Z',
        },
      ],
    },
  },
} as unknown as Extrajourney;

// Trip with a driver intermediate stop between origin and destination.
const tripWithIntermediate = {
  id: 'ENT:ServiceJourney:1',
  estimatedVehicleJourney: {
    recordedAtTime: '2026-05-20T09:00:00.000Z',
    lineRef: 'ENT:CarPooling:trip-1',
    publishedLineName: 'Carpooling trip ENT:Authority:ENT',
    vehicleMode: 'bus',
    estimatedCalls: {
      estimatedCall: [
        {
          order: 1,
          stopPointName: 'Oslo S',
          destinationDisplay: 'Bergen',
          aimedDepartureTime: '2026-06-01T09:00:00.000Z',
        },
        {
          order: 2,
          stopPointName: 'Hønefoss',
          destinationDisplay: 'Bergen',
          aimedArrivalTime: '2026-06-01T10:00:00.000Z',
        },
        {
          order: 3,
          stopPointName: 'Bergen stasjon',
          destinationDisplay: 'Bergen',
          aimedArrivalTime: '2026-06-01T15:00:00.000Z',
        },
      ],
    },
  },
} as unknown as Extrajourney;

const renderAt = (path = '/book-trip/ENT/ENT:ServiceJourney:1') =>
  renderWithRouter(<PassengerTripBooking />, { path, route: '/book-trip/:codespace/:tripId' });

const selectPickupAndDropoff = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'stub-select-pickup' }));
  await user.click(screen.getByRole('button', { name: 'stub-select-dropoff' }));
};

describe('PassengerTripBooking', () => {
  it('shows a loading state while the trip query is pending', () => {
    queryExtraJourney.mockReturnValue(new Promise(() => {}));

    renderAt();

    expect(screen.getByText('Loading trip details...')).toBeInTheDocument();
  });

  it('renders the trip line name once the trip resolves', async () => {
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt();

    expect(await screen.findByText('Carpooling trip ENT:Authority:ENT')).toBeInTheDocument();
  });

  it('disables Book Ride until both pickup and dropoff are selected', async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt();

    const bookButton = await screen.findByRole('button', { name: 'Book Ride' });
    expect(bookButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'stub-select-pickup' }));
    expect(bookButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'stub-select-dropoff' }));
    expect(bookButton).toBeEnabled();
  });

  it('submits the booking payload and shows a confirmation', async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });
    bookPassengerRide.mockResolvedValue({ data: 'ok' });

    renderAt();

    await screen.findByText('Carpooling trip ENT:Authority:ENT');
    await user.click(screen.getByRole('button', { name: 'stub-select-pickup' }));
    await user.click(screen.getByRole('button', { name: 'stub-select-dropoff' }));
    await user.click(screen.getByRole('button', { name: 'Book Ride' }));

    await waitFor(() => expect(bookPassengerRide).toHaveBeenCalledTimes(1));
    const [submittedTrip, payload, submittedAuthority] = bookPassengerRide.mock.calls[0];
    expect(submittedTrip).toBe(trip);
    expect(submittedAuthority).toBe('ENT:Authority:ENT');
    expect(payload).toMatchObject({
      tripId: 'ENT:ServiceJourney:1',
      pickupCoordinates: [10.7522, 59.9139],
      dropoffCoordinates: [5.3221, 60.3913],
      numberOfPassengers: 1,
      passengerDeviationBudget: 5,
    });

    expect(await screen.findByText(/Ride booking confirmed/)).toBeInTheDocument();
  });

  it('surfaces a booking failure', async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });
    bookPassengerRide.mockResolvedValue({ error: { message: 'Backend rejected booking' } });

    renderAt();

    await screen.findByText('Carpooling trip ENT:Authority:ENT');
    await user.click(screen.getByRole('button', { name: 'stub-select-pickup' }));
    await user.click(screen.getByRole('button', { name: 'stub-select-dropoff' }));
    await user.click(screen.getByRole('button', { name: 'Book Ride' }));

    expect(await screen.findByText(/Booking failed: Backend rejected booking/)).toBeInTheDocument();
  });

  it('pre-populates pickup and dropoff from URL query parameters', async () => {
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt(
      '/book-trip/ENT/ENT:ServiceJourney:1?from_coordinate=59.9139,10.7522&to_coordinate=60.3913,5.3221'
    );

    await screen.findByText('Carpooling trip ENT:Authority:ENT');

    expect(screen.getByDisplayValue('59.913900, 10.752200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60.391300, 5.322100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book Ride' })).toBeEnabled();
  });

  it('labels the coordinate text fields as "Pickup Coordinates" and "Dropoff Coordinates"', async () => {
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt();

    expect(await screen.findByLabelText('Your Pickup Coordinates')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Dropoff Coordinates')).toBeInTheDocument();
    expect(screen.queryByLabelText('Your Origin Location')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Your Destination Location')).not.toBeInTheDocument();
  });

  it('does not surface a pre-selection notice when coordinates are present in the URL', async () => {
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt(
      '/book-trip/ENT/ENT:ServiceJourney:1?from_coordinate=59.9139,10.7522&to_coordinate=60.3913,5.3221'
    );

    await screen.findByText('Carpooling trip ENT:Authority:ENT');

    expect(screen.queryByText(/pre-selected from the shared URL/i)).not.toBeInTheDocument();
  });

  it('labels the selected stops as "Your pickup" / "Your dropoff" in the route list', async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt();
    await screen.findByText('Carpooling trip ENT:Authority:ENT');
    await selectPickupAndDropoff(user);

    expect(await screen.findByText('Your pickup')).toBeInTheDocument();
    expect(screen.getByText('Your dropoff')).toBeInTheDocument();
  });

  it("renames the driver's intermediate stop to 'Intermediate stop 1' in the route list", async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: tripWithIntermediate } });

    renderAt();
    await screen.findByText('Carpooling trip ENT:Authority:ENT');
    await selectPickupAndDropoff(user);

    expect(await screen.findByText('Intermediate stop 1')).toBeInTheDocument();
    // The raw place name is not shown for the intermediate stop.
    expect(screen.queryByText('Hønefoss')).not.toBeInTheDocument();
  });

  it('warns when the booking exceeds vehicle capacity but still allows booking', async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: tripWithCapacity } });

    renderAt();
    await screen.findByText('Carpooling trip ENT:Authority:ENT');
    await selectPickupAndDropoff(user);

    // driver (1) + 4 passengers = 5 > capacity 4
    fireEvent.change(screen.getByLabelText('Number of passengers'), { target: { value: '4' } });

    // The warning banner names the over-capacity point.
    expect(
      await screen.findByText(/this booking puts the vehicle over capacity/i)
    ).toBeInTheDocument();
    // Over capacity is allowed — booking stays enabled.
    expect(screen.getByRole('button', { name: 'Book Ride' })).toBeEnabled();
  });

  it('clears the pickup and dropoff selection', async () => {
    const user = userEvent.setup();
    queryExtraJourney.mockResolvedValue({ data: { extraJourney: trip } });

    renderAt();
    await screen.findByText('Carpooling trip ENT:Authority:ENT');
    await selectPickupAndDropoff(user);

    const bookButton = screen.getByRole('button', { name: 'Book Ride' });
    expect(bookButton).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Clear pickup/i }));

    expect(bookButton).toBeDisabled();
    expect(screen.getByLabelText('Your Pickup Coordinates')).toHaveValue('');
    expect(screen.getByLabelText('Your Dropoff Coordinates')).toHaveValue('');
  });
});
