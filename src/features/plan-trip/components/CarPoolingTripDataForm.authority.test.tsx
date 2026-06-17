import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Feature } from 'geojson';

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

const renderForm = () =>
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CarPoolingTripDataForm {...baseProps} />
    </LocalizationProvider>
  );

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
