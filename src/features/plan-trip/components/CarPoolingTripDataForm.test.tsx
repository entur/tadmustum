import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import type { Feature, Point, Position } from 'geojson';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData';
import type { Extrajourney } from '../../../shared/model/Extrajourney';
import type { EstimatedCall } from '../../../shared/model/EstimatedCall';

const streetRoute = vi.fn();

// The real MUI DateTimePicker spreads each field's label across several nodes
// (the field group, the "Choose date" button, the spin buttons), so
// getByLabelText(label) matches multiple elements and throws. These tests only
// assert on a field's label and disabled state, so swap the picker for a plain
// input that surfaces both through a single accessible label.
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({
    label,
    disabled,
    value,
    onChange,
  }: {
    label: string;
    disabled?: boolean;
    value: unknown;
    onChange: (v: unknown) => void;
  }) => (
    <input
      aria-label={label}
      disabled={disabled}
      value={value ? String(value) : ''}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

vi.mock('../hooks/useStreetRoute', () => ({ useStreetRoute: () => streetRoute }));
// The hook below must return a STABLE reference: the component lists the
// adminCodespaces array in a useEffect dependency array, so handing back a fresh
// array literal on every render would re-fire the effect (which calls setValue)
// and spin into an infinite render loop. The real hook memoizes its result; the
// mock builds the array once and reuses it.
vi.mock('../../../shared/hooks/useAllowedCodespaces', () => {
  const adminCodespaces = ['ENT'];
  return { useAllowedCodespaces: () => ({ adminCodespaces }) };
});

import CarPoolingTripDataForm from './CarPoolingTripDataForm';

const baseProps = {
  onAddDeparturestopClick: vi.fn(),
  onRemoveDepartureStopClick: vi.fn(),
  onAddDestinationtopClick: vi.fn(),
  onRemoveDestinationStopClick: vi.fn(),
  onResetCallback: vi.fn(),
  onSubmitCallback: vi.fn(),
  onViewTripCallback: vi.fn(),
  onZoomToFeature: vi.fn(),
  mapDepartureFlexibleStop: null as Feature | null,
  mapDestinationFlexibleStop: null as Feature | null,
  drawingStopsAllowed: true,
  onRouteGeometryChange: vi.fn(),
};

const point = (lng: number, lat: number): Feature<Point> => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: {},
});

const editingState = (): CarPoolingTripDataFormData => ({
  dataSource: 'ENT',
  id: 'ENT:ServiceJourney:42',
  departureStopName: 'Oslo S',
  departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
  estimateArrivalAutomatically: false,
  setStopNamesAutomatically: false,
  departureFlexibleStop: [10.7522, 59.9139],
  departureCancellation: false,
  destinationStopName: 'Bergen stasjon',
  destinationDatetime: dayjs('2026-06-01T15:00:00.000Z'),
  destinationFlexibleStop: [5.3221, 60.3913],
  destinationCancellation: false,
  intermediateCalls: [],
  tripCancellation: false,
  driverDeviationBudget: 30,
  contactUrl: null,
  totalCapacity: 4,
  onboardCount: 1,
});

const formElement = (
  props: Partial<
    typeof baseProps & { initialState: CarPoolingTripDataFormData; tripData: Extrajourney }
  > = {}
) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <CarPoolingTripDataForm {...baseProps} {...props} />
  </LocalizationProvider>
);

const renderForm = (
  props: Partial<
    typeof baseProps & { initialState: CarPoolingTripDataFormData; tripData: Extrajourney }
  > = {}
) => render(formElement(props));

describe('CarPoolingTripDataForm — automatic arrival estimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streetRoute.mockResolvedValue({
      expectedStartTime: '2026-06-01T09:00:00.000Z',
      expectedEndTime: '2026-06-01T16:00:00.000Z',
      duration: 0,
      distance: 0,
      geometry: [
        [10.7522, 59.9139],
        [5.3221, 60.3913],
      ],
    });
  });

  it('defaults a new trip to auto-estimate on, with the arrival picker disabled', () => {
    renderForm();

    expect(
      screen.getByRole('checkbox', { name: 'Estimate arrival time automatically' })
    ).toBeChecked();
    expect(screen.getByLabelText(/Arrival time \(estimated\)/i)).toBeDisabled();
  });

  it('enables the arrival picker when auto-estimate is turned off', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('checkbox', { name: 'Estimate arrival time automatically' }));

    expect(
      screen.getByRole('checkbox', { name: 'Estimate arrival time automatically' })
    ).not.toBeChecked();
    expect(screen.getByLabelText(/Select arrival time/i)).toBeEnabled();
  });

  it('defaults an existing trip to auto-estimate off (arrival preserved, picker enabled)', async () => {
    renderForm({ initialState: editingState() });

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Estimate arrival time automatically' })
      ).not.toBeChecked()
    );
    expect(screen.getByLabelText(/Select arrival time/i)).toBeEnabled();
    // The route may still be fetched (to draw the driving path on the map),
    // but the saved arrival is never overwritten when auto-estimate is off.
    const savedArrival = String(editingState().destinationDatetime);
    await waitFor(() =>
      expect(screen.getByLabelText(/Select arrival time/i)).toHaveValue(savedArrival)
    );
  });

  it('queries OTP for the arrival when auto-estimate is on and both stops are placed', async () => {
    renderForm({
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
    });

    await waitFor(() => expect(streetRoute).toHaveBeenCalled());
    expect(streetRoute).toHaveBeenCalledWith(
      [10.7522, 59.9139],
      [5.3221, 60.3913],
      expect.any(String)
    );
    // The routed expectedEndTime is written into the (disabled) arrival field.
    await waitFor(() =>
      expect(screen.getByLabelText(/Arrival time \(estimated\)/i)).toHaveValue(
        String(dayjs('2026-06-01T16:00:00.000Z'))
      )
    );
  });

  it('reports the routed street geometry so the map can draw the driving route', async () => {
    const onRouteGeometryChange = vi.fn();
    renderForm({
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
      onRouteGeometryChange,
    });

    // One leg (no intermediate stops), reported as a list of leg linestrings.
    await waitFor(() =>
      expect(onRouteGeometryChange).toHaveBeenCalledWith([
        [
          [10.7522, 59.9139],
          [5.3221, 60.3913],
        ],
      ])
    );
  });

  it('routes leg by leg through non-cancelled intermediate stops', async () => {
    // A stop's coordinate is the centroid of its flexible area, so a polygon
    // collapsed onto a single point yields exactly that point.
    const intermediateAt = (lng: number, lat: number, cancellation = false): EstimatedCall => ({
      order: 2,
      stopPointRef: 'ENT:PickupPoint:1',
      stopPointName: 'Passenger pickup',
      destinationDisplay: 'Bergen',
      cancellation,
      departureStopAssignment: {
        expectedFlexibleArea: {
          polygon: { exterior: { posList: `${lng} ${lat} ${lng} ${lat}` } },
        },
      },
    });

    renderForm({
      initialState: {
        ...editingState(),
        intermediateCalls: [intermediateAt(10.9, 59.95), intermediateAt(10.5, 60.1, true)],
      },
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
    });

    // The cancelled stop is skipped; the chain is origin -> pickup -> destination.
    await waitFor(() =>
      expect(streetRoute).toHaveBeenCalledWith([10.9, 59.95], [5.3221, 60.3913], expect.any(String))
    );
    expect(streetRoute).toHaveBeenCalledWith([10.7522, 59.9139], [10.9, 59.95], expect.any(String));
    expect(streetRoute).not.toHaveBeenCalledWith(
      expect.anything(),
      [10.5, 60.1],
      expect.any(String)
    );
  });

  it('still estimates the arrival when two stops share a location', async () => {
    // The journey planner returns no trip patterns for a route between two
    // identical points — there is no trip to make. Mimic that: treating such a
    // leg as unroutable used to fail the whole chain, so a trip with two stops
    // in the same spot lost its arrival estimate and its route line.
    streetRoute.mockImplementation(async (from: Position, to: Position, dateTime: string) =>
      from[0] === to[0] && from[1] === to[1]
        ? null
        : {
            expectedStartTime: dateTime,
            expectedEndTime: '2026-06-01T16:00:00.000Z',
            duration: 0,
            distance: 0,
            geometry: [from, to],
          }
    );
    const stopAt = (lng: number, lat: number): EstimatedCall => ({
      order: 2,
      stopPointRef: 'ENT:PickupPoint:1',
      stopPointName: 'Passenger pickup',
      destinationDisplay: 'Bergen',
      cancellation: false,
      departureStopAssignment: {
        expectedFlexibleArea: {
          polygon: { exterior: { posList: `${lng} ${lat} ${lng} ${lat}` } },
        },
      },
    });
    const onRouteGeometryChange = vi.fn();

    renderForm({
      initialState: {
        ...editingState(),
        estimateArrivalAutomatically: true,
        // A pickup exactly on the departure stop.
        intermediateCalls: [stopAt(10.7522, 59.9139)],
      },
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
      onRouteGeometryChange,
    });

    await waitFor(() =>
      expect(screen.getByLabelText(/Arrival time \(estimated\)/i)).toHaveValue(
        String(dayjs('2026-06-01T16:00:00.000Z'))
      )
    );
    expect(screen.queryByText(/Could not fetch the driving route/i)).not.toBeInTheDocument();
    expect(onRouteGeometryChange).not.toHaveBeenCalledWith('failed');
  });

  it('warns, but still draws and times the trip, when one leg cannot be planned', async () => {
    // A trip through an intermediate stop, where only the second leg is one the
    // journey planner will not plan.
    streetRoute.mockImplementation(async (from: Position, to: Position, dateTime: string) =>
      from[0] === 10.9
        ? null
        : {
            expectedStartTime: dateTime,
            expectedEndTime: '2026-06-01T09:00:00.000Z',
            duration: 0,
            distance: 0,
            geometry: [from, to],
          }
    );
    const onRouteGeometryChange = vi.fn();

    renderForm({
      initialState: {
        ...editingState(),
        estimateArrivalAutomatically: true,
        intermediateCalls: [
          {
            order: 2,
            stopPointRef: 'ENT:PickupPoint:1',
            stopPointName: 'Passenger pickup',
            destinationDisplay: 'Bergen',
            cancellation: false,
            departureStopAssignment: {
              expectedFlexibleArea: {
                polygon: { exterior: { posList: '10.9 59.95 10.9 59.95' } },
              },
            },
          },
        ],
      },
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
      onRouteGeometryChange,
    });

    // Two legs come back: the planned one, and the straight segment standing in
    // for the leg the planner declined — rather than the whole route being lost.
    await waitFor(() => expect(screen.getByText(/could not plan one leg/i)).toBeInTheDocument());
    expect(onRouteGeometryChange).not.toHaveBeenCalledWith('failed');
    const drawn = onRouteGeometryChange.mock.calls.map(([geometry]) => geometry).at(-1);
    expect(drawn).toHaveLength(2);
    expect(drawn[1]).toEqual([
      [10.9, 59.95],
      [5.3221, 60.3913],
    ]);
  });

  it('still times the trip when the journey planner is unreachable', async () => {
    streetRoute.mockRejectedValue(new Error('journey planner is down'));
    const onRouteGeometryChange = vi.fn();
    renderForm({
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
      onRouteGeometryChange,
    });

    // Nothing was planned, so the map shows its dashed straight line as before…
    await waitFor(() => expect(onRouteGeometryChange).toHaveBeenCalledWith('failed'));
    // …but the arrival is still estimated from the distance rather than left
    // empty: Oslo to Bergen is about 305 km, so it lands hours after departure.
    const arrival = screen.getByLabelText(/Arrival time \(estimated\)/i) as HTMLInputElement;
    await waitFor(() =>
      expect(dayjs(arrival.value).isAfter(dayjs('2026-06-01T08:00:00.000Z'))).toBe(true)
    );
  });

  it('clears the route geometry when a stop is missing', () => {
    const onRouteGeometryChange = vi.fn();
    renderForm({
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      onRouteGeometryChange,
    });

    expect(onRouteGeometryChange).toHaveBeenCalledWith(null);
    expect(streetRoute).not.toHaveBeenCalled();
  });
});

describe('CarPoolingTripDataForm — trip duration warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns when arrival plus deviation budget exceeds 2.5 hours after departure', () => {
    // editingState is an 08:00 → 15:00 trip (7h) with a 30-min budget — well over the limit.
    renderForm({ initialState: editingState() });

    expect(screen.getByText(/longer than 2.5 hours/i)).toBeInTheDocument();
  });

  it('does not warn when the trip stays within 2.5 hours', () => {
    renderForm({
      initialState: {
        ...editingState(),
        // 08:00 → 09:00 (1h) plus the 30-min budget = 1h30m, within the limit.
        destinationDatetime: dayjs('2026-06-01T09:00:00.000Z'),
      },
    });

    expect(screen.queryByText(/longer than 2.5 hours/i)).not.toBeInTheDocument();
  });

  it('warns only because of the deviation budget when arrival alone is within the limit', () => {
    renderForm({
      initialState: {
        ...editingState(),
        // 08:00 → 10:20 (2h20m) is within 2.5h, but +30-min budget pushes it to 2h50m.
        destinationDatetime: dayjs('2026-06-01T10:20:00.000Z'),
      },
    });

    expect(screen.getByText(/longer than 2.5 hours/i)).toBeInTheDocument();
  });
});

describe('CarPoolingTripDataForm — the trip route list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streetRoute.mockResolvedValue(null);
  });

  // The stop list is only rendered for a trip that already exists.
  const tripWith = (intermediateName: string) =>
    ({
      id: 'ENT:ServiceJourney:42',
      estimatedVehicleJourney: {
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointName: 'Oslo S',
              aimedDepartureTime: '2026-06-01T08:00:00.000Z',
            },
            {
              order: 2,
              stopPointName: intermediateName,
              aimedArrivalTime: '2026-06-01T10:00:00.000Z',
            },
            {
              order: 3,
              stopPointName: 'Bergen stasjon',
              aimedArrivalTime: '2026-06-01T15:00:00.000Z',
            },
          ],
        },
      },
    }) as unknown as Extrajourney;

  it('shows every stop by its own name', () => {
    renderForm({ initialState: editingState(), tripData: tripWith('Hønefoss') });

    // Stops are named after the place they are at, so a driver reading the list
    // can tell which stop is which.
    expect(screen.getByText('Hønefoss')).toBeInTheDocument();
    expect(screen.queryByText('Intermediate stop 1')).not.toBeInTheDocument();
    // The chip still says what kind of stop it is.
    expect(screen.getByText('Intermediate stop')).toBeInTheDocument();
  });

  it('numbers a stop that has no name of its own', () => {
    renderForm({ initialState: editingState(), tripData: tripWith('') });

    expect(screen.getByText('Intermediate stop 1')).toBeInTheDocument();
  });
});

describe('CarPoolingTripDataForm — no operator field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streetRoute.mockResolvedValue(null);
  });

  it('does not render an operator picker', () => {
    // The operatorRef is a constant written by prepareCarpoolingFormData, so
    // there is nothing to pick, nothing to fetch and nothing that can fail.
    renderForm();

    expect(screen.queryByRole('combobox', { name: 'Operator' })).not.toBeInTheDocument();
  });
});

describe('CarPoolingTripDataForm — automatic stop names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streetRoute.mockResolvedValue(null);
  });

  const departureName = () => screen.getByLabelText(/Departure stop name/i);
  const destinationName = () => screen.getByLabelText(/Destination stop name/i);

  it('defaults a new trip to automatic names, with both name fields disabled', () => {
    renderForm();

    expect(screen.getByRole('checkbox', { name: 'Set stop names automatically' })).toBeChecked();
    expect(departureName()).toBeDisabled();
    expect(destinationName()).toBeDisabled();
  });

  it('names both stops after the nearest known place once they are on the map', async () => {
    renderForm({
      mapDepartureFlexibleStop: point(10.758, 59.923),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
    });

    // The pin is in Grünerløkka, a district of Oslo: the list is fine-grained
    // enough to name the district, and qualifies it with the municipality.
    await waitFor(() => expect(departureName()).toHaveValue('Grünerløkka, Oslo'));
    expect(destinationName()).toHaveValue('Bergen');
  });

  it('keeps the default names until a stop is placed', async () => {
    renderForm();

    await waitFor(() => expect(departureName()).toHaveValue('Origin'));
    expect(destinationName()).toHaveValue('Destination');
  });

  it('renames a stop when it moves on the map', async () => {
    const { rerender } = renderForm({ mapDepartureFlexibleStop: point(10.758, 59.923) });
    await waitFor(() => expect(departureName()).toHaveValue('Grünerløkka, Oslo'));

    rerender(formElement({ mapDepartureFlexibleStop: point(10.3951, 63.4305) }));

    await waitFor(() => expect(departureName()).toHaveValue('Trondheim'));
  });

  it('lets the user type a name once automatic naming is turned off', async () => {
    const user = userEvent.setup();
    renderForm({ mapDepartureFlexibleStop: point(10.3951, 63.4305) });
    await waitFor(() => expect(departureName()).toHaveValue('Trondheim'));

    await user.click(screen.getByRole('checkbox', { name: 'Set stop names automatically' }));

    // The last automatic name is kept as the starting point rather than reverted.
    expect(departureName()).toBeEnabled();
    expect(departureName()).toHaveValue('Trondheim');

    await user.clear(departureName());
    await user.type(departureName(), 'Trondheim bussterminal');
    expect(departureName()).toHaveValue('Trondheim bussterminal');
  });

  it('never overwrites a typed name while automatic naming is off', async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm();
    await user.click(screen.getByRole('checkbox', { name: 'Set stop names automatically' }));
    await user.clear(departureName());
    await user.type(departureName(), 'Behind the church');

    // Placing a stop on the map must not rename it now that the user owns the field.
    rerender(formElement({ mapDepartureFlexibleStop: point(10.7522, 59.9139) }));

    expect(departureName()).toHaveValue('Behind the church');
  });

  it('defaults an existing trip to automatic naming off, keeping its saved names', async () => {
    renderForm({
      initialState: editingState(),
      mapDepartureFlexibleStop: point(10.758, 59.923),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
    });

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Set stop names automatically' })
      ).not.toBeChecked()
    );
    expect(departureName()).toHaveValue('Oslo S');
    expect(destinationName()).toHaveValue('Bergen stasjon');
    expect(departureName()).toBeEnabled();
  });

  it('renames the stops of an existing trip once the option is switched on', async () => {
    const user = userEvent.setup();
    renderForm({
      initialState: editingState(),
      mapDepartureFlexibleStop: point(10.758, 59.923),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
    });
    await waitFor(() => expect(departureName()).toHaveValue('Oslo S'));

    await user.click(screen.getByRole('checkbox', { name: 'Set stop names automatically' }));

    await waitFor(() => expect(departureName()).toHaveValue('Grünerløkka, Oslo'));
    expect(destinationName()).toHaveValue('Bergen');
  });
});
