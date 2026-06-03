import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import type { Feature, Point } from 'geojson';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData';
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
// The hooks below must return STABLE references: the component lists the
// operators/authorities arrays in a useEffect dependency array, so handing back
// a fresh array literal on every render would re-fire the effect (which calls
// setValue) and spin into an infinite render loop. The real hooks memoize their
// results; the mocks build the arrays once and reuse them.
vi.mock('../hooks/useOperators', () => {
  const operators = [{ id: 'ENT:Operator:1', name: 'Entur' }];
  return { useOperators: () => operators };
});
vi.mock('../../../shared/hooks/useAuthorities', () => {
  const adminAuthorities = [{ id: 'ENT:Authority:ENT', name: 'Entur' }];
  return { useAuthorities: () => ({ adminAuthorities }) };
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
  authority: 'ENT:Authority:ENT',
  operator: 'ENT:Operator:1',
  id: 'ENT:ServiceJourney:42',
  departureStopName: 'Oslo S',
  departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
  estimateArrivalAutomatically: false,
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

const renderForm = (
  props: Partial<typeof baseProps & { initialState: CarPoolingTripDataFormData }> = {}
) =>
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CarPoolingTripDataForm {...baseProps} {...props} />
    </LocalizationProvider>
  );

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

  it("reports 'failed' when the journey planner cannot route the trip", async () => {
    streetRoute.mockResolvedValue(null);
    const onRouteGeometryChange = vi.fn();
    renderForm({
      mapDepartureFlexibleStop: point(10.7522, 59.9139),
      mapDestinationFlexibleStop: point(5.3221, 60.3913),
      onRouteGeometryChange,
    });

    await waitFor(() => expect(onRouteGeometryChange).toHaveBeenCalledWith('failed'));
    // The failure is surfaced to the user, not just to the map.
    expect(
      screen.getByText(/Could not fetch the driving route from the journey planner/i)
    ).toBeInTheDocument();
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
