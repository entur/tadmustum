import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { ComponentProps } from 'react';
import type { Feature } from 'geojson';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData';

const streetRoute = vi.fn();

// Swap the real DateTimePicker for a plain input (see CarPoolingTripDataForm.test.tsx).
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
vi.mock('../hooks/useOperators', () => {
  const operators = [{ id: 'ENT:Operator:1', name: 'Entur' }];
  return { useOperators: () => operators };
});
// Two authorities in different codespaces, so the Authority picker is rendered.
// Stable reference (built once) to avoid re-firing the effect on every render.
vi.mock('../../../shared/hooks/useAuthorities', () => {
  const adminAuthorities = [
    { id: 'ENT:Authority:ENT', name: 'Entur' },
    { id: 'ATB:Authority:ATB', name: 'AtB' },
  ];
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

const renderForm = (override: Partial<ComponentProps<typeof CarPoolingTripDataForm>> = {}) =>
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CarPoolingTripDataForm {...baseProps} {...override} />
    </LocalizationProvider>
  );

// An existing AtB trip being edited. Its code, lineRef and booking URL are the
// trip's fixed ATB-scoped identity.
const editingInitialState: CarPoolingTripDataFormData = {
  authority: 'ATB:Authority:ATB',
  operator: 'ENT:Operator:1',
  id: 'ATB:ServiceJourney:fixed-123',
  lineRef: 'ATB:CarPooling:fixed-123',
  estimatedVehicleJourneyCode: 'ATB:ServiceJourney:fixed-123',
  departureStopName: 'Origin',
  departureDatetime: dayjs('2030-01-01T10:00:00.000Z'),
  estimateArrivalAutomatically: false,
  departureFlexibleStop: [10, 60],
  departureCancellation: false,
  destinationStopName: 'Destination',
  destinationDatetime: dayjs('2030-01-01T11:00:00.000Z'),
  destinationFlexibleStop: [11, 61],
  destinationCancellation: false,
  intermediateCalls: [],
  tripCancellation: false,
  driverDeviationBudget: 15,
  contactUrl: 'https://example.test/book-trip/ATB/ATB:ServiceJourney:fixed-123',
  totalCapacity: 5,
  onboardCount: 1,
};

describe('CarPoolingTripDataForm — booking URL tracks the selected authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streetRoute.mockResolvedValue(null);
  });

  it('re-mints the journey code and booking URL when the authority changes on a new trip', async () => {
    const user = userEvent.setup();
    renderForm();

    const bookingUrl = () => screen.getByLabelText('Booking URL') as HTMLInputElement;

    // New trips default to the ENT-prefixed authority, so the booking URL is an ENT URL whose
    // embedded code is an ENT:ServiceJourney code.
    await waitFor(() =>
      expect(bookingUrl().value).toMatch(/\/book-trip\/ENT\/ENT:ServiceJourney:/)
    );

    // Switch to the AtB authority (a different codespace).
    await user.click(screen.getByRole('combobox', { name: 'Authority' }));
    await user.click(screen.getByRole('option', { name: 'AtB' }));

    // The booking URL and its embedded code now belong to the AtB codespace — not the stale ENT
    // one — so the published link resolves under the codespace the trip is actually saved under.
    await waitFor(() =>
      expect(bookingUrl().value).toMatch(/\/book-trip\/ATB\/ATB:ServiceJourney:/)
    );
    expect(bookingUrl().value).not.toContain('ENT');
  });
});

describe('CarPoolingTripDataForm — authority is locked when editing an existing trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streetRoute.mockResolvedValue(null);
  });

  it("disables the authority picker and keeps the trip's existing code and booking URL", async () => {
    renderForm({ initialState: editingInitialState });

    // The lock explanation replaces the validation message in edit mode.
    await screen.findByText(/authority is fixed once it's created/i);

    // The picker is rendered (two codespaces) but cannot be changed: changing a
    // saved trip's authority/codespace would orphan it server-side.
    const authority = screen.getByRole('combobox', { name: 'Authority' });
    expect(authority).toHaveAttribute('aria-disabled', 'true');

    // The booking URL and its embedded code are the trip's fixed identity — they
    // are not re-minted, so the published link keeps resolving to the stored trip.
    const bookingUrl = screen.getByLabelText('Booking URL') as HTMLInputElement;
    await waitFor(() =>
      expect(bookingUrl.value).toBe(
        'https://example.test/book-trip/ATB/ATB:ServiceJourney:fixed-123'
      )
    );
  });
});
