import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { Position } from 'geojson';
import type { StopPlacedHandler } from '../hooks/useFlexTourStops';
import { defaultServiceDate, TRONDHEIM_FLEX_LINE } from '../model/trondheimFlexLine';

// Swap the pickers for plain inputs (see CarPoolingTripDataForm.test.tsx). Defined inside each
// factory: vi.mock is hoisted above the module body, so it cannot close over a top-level const.
// The stub hands back a Dayjs, like the real pickers do — the form reads `.isValid()` off these
// values, so a raw string would make every date look unset.
type PickerProps = { label: string; value: unknown; onChange: (v: unknown) => void };
const pickerStub = ({ label, value, onChange }: PickerProps) => (
  <input
    aria-label={label}
    value={value ? String(value) : ''}
    onChange={e => onChange(dayjs(e.target.value))}
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

/** The tour start a fresh form anchors stop 1 at: 09:00 on the default service date. */
const tourStart = () => defaultServiceDate().hour(9).minute(0).second(0).millisecond(0);

/**
 * A leg that always takes 20 minutes from whenever it is asked to depart. Relative rather than
 * fixed, so the expected arrivals follow the form's own default service date instead of hard-coding
 * a date that drifts out of range as the default moves.
 */
const twentyMinuteLeg = (_from: Position, _to: Position, dateTime: string) =>
  Promise.resolve({
    expectedStartTime: dateTime,
    expectedEndTime: dayjs(dateTime).add(20, 'minute').toISOString(),
    duration: 1200,
    distance: 8000,
    geometry: [
      [10.4, 63.42],
      [10.32, 63.39],
    ] as Position[],
  });

/** Places the two default stops on the map and waits for the route to settle. */
const placeBothStops = async (placeStop: StopPlacedHandler) => {
  await act(async () => {
    placeStop({ kind: 'booked', index: 0 }, 'feature-1', [10.4, 63.42]);
    placeStop({ kind: 'booked', index: 1 }, 'feature-2', [10.32, 63.39]);
  });
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

  it('estimates the arrival of every stop but the first from the routed driving time', async () => {
    streetRoute.mockImplementation(twentyMinuteLeg);
    let placeStop: StopPlacedHandler = () => {};
    renderForm({
      registerStopPlacedHandler: handler => {
        placeStop = handler;
      },
    });

    await screen.findByText('Booked stops (2)');
    const firstArrivalBefore = (screen.getAllByLabelText(/Expected arrival/)[0] as HTMLInputElement)
      .value;

    await placeBothStops(placeStop);

    // The second stop takes the routed arrival — the 1 min default dwell at stop 1 plus 20 min of
    // driving. The first stop keeps the time it anchored the tour with.
    await waitFor(() =>
      expect(screen.getByLabelText('Expected arrival (estimated)')).toHaveValue(
        String(tourStart().add(21, 'minute'))
      )
    );
    expect(screen.getAllByLabelText(/Expected arrival/)[0]).toHaveValue(firstArrivalBefore);
  });

  it('departs each leg after the dwell, so estimates do not trip the dwell warning', async () => {
    streetRoute.mockImplementation(twentyMinuteLeg);
    let placeStop: StopPlacedHandler = () => {};
    renderForm({
      registerStopPlacedHandler: handler => {
        placeStop = handler;
      },
    });

    await screen.findByText('Booked stops (2)');
    await placeBothStops(placeStop);

    // The tour is anchored at 09:00 on the default service date, and the form's default dwell is
    // 1 minute — so the leg is planned from 09:01, not from the arrival itself.
    await waitFor(() => expect(streetRoute).toHaveBeenCalled());
    const [, , departedAt] = streetRoute.mock.calls[streetRoute.mock.calls.length - 1];
    expect(departedAt).toBe(tourStart().add(1, 'minute').toISOString());
    expect(screen.queryByText(/arrives before the previous stop's dwell/)).not.toBeInTheDocument();
  });

  it('leaves every arrival to the user once estimating is switched off', async () => {
    streetRoute.mockImplementation(twentyMinuteLeg);
    let placeStop: StopPlacedHandler = () => {};
    renderForm({
      registerStopPlacedHandler: handler => {
        placeStop = handler;
      },
    });

    await screen.findByText('Booked stops (2)');
    await placeBothStops(placeStop);
    await waitFor(() =>
      expect(screen.getByLabelText('Expected arrival (estimated)')).toBeInTheDocument()
    );

    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Estimate arrival times automatically' }));

    // Both stops become plain, editable arrival fields again.
    expect(screen.queryByLabelText('Expected arrival (estimated)')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Expected arrival')).toHaveLength(2);
  });

  it('estimates arrivals by default', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    expect(
      screen.getByRole('checkbox', { name: 'Estimate arrival times automatically' })
    ).toBeChecked();
  });

  it('defaults the booking URL to this tour’s flex booking page', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    expect(screen.getByLabelText('Booking URL')).toHaveValue(
      `${window.location.origin}/book-flex/MAL/${TRONDHEIM_FLEX_LINE.serviceJourneyRef}:${defaultServiceDate().format('YYYY-MM-DD')}`
    );
  });

  it('re-derives the booking URL when the service date changes', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    // The journey code embeds the service date, so the link would otherwise point at another day's
    // tour. The stubbed DatePicker hands back a raw string, which dayjs parses.
    await userEvent.setup().clear(screen.getByLabelText('Service date'));
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Service date'), { target: { value: '2026-09-14' } });
    });

    await waitFor(() =>
      expect(screen.getByLabelText('Booking URL')).toHaveValue(
        `${window.location.origin}/book-flex/MAL/${TRONDHEIM_FLEX_LINE.serviceJourneyRef}:2026-09-14`
      )
    );
  });

  it('stops re-deriving the booking URL once it has been edited by hand', async () => {
    renderForm();

    await screen.findByText('Booked stops (2)');
    const bookingUrl = screen.getByLabelText('Booking URL');
    await userEvent.setup().clear(bookingUrl);
    await act(async () => {
      fireEvent.change(bookingUrl, { target: { value: 'https://example.test/my-own-page' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Service date'), { target: { value: '2026-09-14' } });
    });

    expect(screen.getByLabelText('Booking URL')).toHaveValue('https://example.test/my-own-page');
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
