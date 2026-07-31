import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Position } from 'geojson';
import type { StopPlacedHandler } from '../hooks/useFlexTourStops';

// Swap the pickers for plain inputs (see CarPoolingTripDataForm.test.tsx). Defined inside each
// factory: vi.mock is hoisted above the module body, so it cannot close over a top-level const.
type PickerProps = { label: string; value: unknown; onChange: (v: unknown) => void };
const pickerStub = ({ label, value, onChange }: PickerProps) => (
  <input
    aria-label={label}
    value={value ? String(value) : ''}
    onChange={e => onChange(e.target.value)}
  />
);
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: (props: PickerProps) => pickerStub(props),
}));
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: PickerProps) => pickerStub(props),
}));

vi.mock('../../../shared/hooks/useAllowedCodespaces', () => {
  const adminCodespaces = ['MAL'];
  return {
    useAllowedCodespaces: () => ({
      allowedCodespaces: adminCodespaces.map(id => ({
        id,
        permissions: ['ADMIN_CARPOOLING_DATA'],
      })),
      adminCodespaces,
      isLoading: false,
      error: null,
    }),
  };
});

const { streetRoute } = vi.hoisted(() => ({ streetRoute: vi.fn() }));
vi.mock('../../plan-trip/hooks/useStreetRoute', () => ({ useStreetRoute: () => streetRoute }));

import FlexTourDataForm from './FlexTourDataForm';

const baseProps = {
  onSubmitCallback: vi.fn(),
  onResetCallback: vi.fn(),
  onAddBookedStopClick: vi.fn(),
  onRemoveStop: vi.fn(),
  onZoomToFeature: vi.fn(),
  onViewTourCallback: vi.fn(),
  drawingStopsAllowed: true,
  registerStopPlacedHandler: vi.fn(),
};

const renderForm = (override: Partial<React.ComponentProps<typeof FlexTourDataForm>> = {}) =>
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <FlexTourDataForm {...baseProps} {...override} />
    </LocalizationProvider>
  );

describe('FlexTourDataForm', () => {
  it('offers two uniform booked stops by default', async () => {
    renderForm();

    expect(await screen.findByText('Booked stops (2)')).toBeInTheDocument();
    expect(screen.getByText('1. Stop')).toBeInTheDocument();
    expect(screen.getByText('2. Stop')).toBeInTheDocument();
    // Which end of the tour a stop is at is a hint on the row, not a field.
    expect(screen.getByText('tour starts here')).toBeInTheDocument();
    expect(screen.getByText('tour ends here')).toBeInTheDocument();
  });

  it('has no separate vehicle-position or tour-start fields', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    expect(screen.queryByLabelText('Vehicle position name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tour start')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /remove vehicle position/i })
    ).not.toBeInTheDocument();
  });

  it('will not let the tour drop below two stops', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    expect(screen.getByRole('button', { name: 'Remove stop 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove stop 2' })).toBeDisabled();
  });

  it('allows removing a stop again once a third is added', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    await userEvent.setup().click(screen.getByRole('button', { name: /add stop/i }));

    expect(await screen.findByText('Booked stops (3)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove stop 1' })).toBeEnabled();
  });

  it('routes the tour and reports the driving path once two stops are placed', async () => {
    streetRoute.mockResolvedValue({
      expectedStartTime: '2026-08-03T09:00:00.000Z',
      expectedEndTime: '2026-08-03T09:20:00.000Z',
      duration: 1200,
      distance: 8000,
      geometry: [
        [10.4, 63.42],
        [10.36, 63.4],
        [10.32, 63.39],
      ],
    });
    const onRouteGeometryChange = vi.fn();
    let placeStop: StopPlacedHandler = () => {};
    renderForm({
      registerStopPlacedHandler: handler => {
        placeStop = handler;
      },
      onRouteGeometryChange,
    });

    await screen.findByText('Booked stops (2)');

    const first: Position = [10.4, 63.42];
    const last: Position = [10.32, 63.39];
    await act(async () => {
      placeStop({ kind: 'booked', index: 0 }, 'feature-1', first);
      placeStop({ kind: 'booked', index: 1 }, 'feature-2', last);
    });

    // One leg between the two stops, carrying the street geometry rather than a straight line.
    await waitFor(() =>
      expect(onRouteGeometryChange).toHaveBeenCalledWith([
        [
          [10.4, 63.42],
          [10.36, 63.4],
          [10.32, 63.39],
        ],
      ])
    );
    expect(streetRoute).toHaveBeenCalledWith(first, last, expect.any(String));
  });

  it('reports no route while fewer than two stops have been placed', async () => {
    const onRouteGeometryChange = vi.fn();
    let placeStop: StopPlacedHandler = () => {};
    renderForm({
      registerStopPlacedHandler: handler => {
        placeStop = handler;
      },
      onRouteGeometryChange,
    });

    await screen.findByText('Booked stops (2)');
    await act(async () => {
      placeStop({ kind: 'booked', index: 0 }, 'feature-1', [10.4, 63.42]);
    });

    expect(onRouteGeometryChange).toHaveBeenCalledWith(null);
    expect(onRouteGeometryChange).not.toHaveBeenCalledWith(expect.any(Array));
  });
});
