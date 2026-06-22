import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Extrajourney } from '../../shared/model/Extrajourney';
import { renderWithRouter } from '../../test/renderWithRouter';
import CarPoolingTrips from './CarPoolingTrips';

const queryExtraJourneys = vi.fn();
const cancelExtrajourney = vi.fn();

// Capture navigation so the action buttons' targets can be asserted; the rest
// of react-router-dom (MemoryRouter, useLocation) stays real.
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('./hooks/useQueryExtraJourney.tsx', () => ({
  useQueryExtraJourney: () => queryExtraJourneys,
}));

vi.mock('../plan-trip/hooks/useCancelExtrajourney.tsx', () => ({
  useCancelExtrajourney: () => cancelExtrajourney,
}));

// useAuthorities drives the fan-out across allowed codespaces; the test pretends
// the user only has access to ENT so the existing single-tenant assertions hold.
// The returned arrays are stable module-level constants (mirroring the real
// hook's memoized output) so the trip-loading effect — keyed on `authorities` —
// runs once instead of re-fetching on every render and clobbering local state.
const AUTHORITIES = [{ id: 'ENT:Authority:ENT', name: 'Entur' }];
const ALLOWED_CODESPACES = [{ id: 'ENT', permissions: ['ADMIN_CARPOOLING_DATA'] }];
vi.mock('../../shared/hooks/useAuthorities.tsx', () => ({
  useAuthorities: () => ({
    authorities: AUTHORITIES,
    allowedCodespaces: ALLOWED_CODESPACES,
  }),
}));

const trip = (overrides: Partial<Extrajourney> = {}): Extrajourney =>
  ({
    id: 'ENT:ServiceJourney:1',
    estimatedVehicleJourney: {
      recordedAtTime: '2026-05-20T09:00:00.000Z',
      lineRef: 'ENT:CarPooling:trip-1',
      estimatedCalls: {
        estimatedCall: [
          {
            order: 1,
            stopPointName: 'Oslo S',
            aimedDepartureTime: '2026-06-01T08:00:00.000Z',
          },
          {
            order: 2,
            stopPointName: 'Bergen stasjon',
            aimedArrivalTime: '2026-06-01T15:00:00.000Z',
            latestExpectedArrivalTime: '2026-06-01T15:30:00.000Z',
          },
        ],
      },
      ...overrides.estimatedVehicleJourney,
    },
    ...overrides,
  }) as Extrajourney;

const renderInRouter = () => renderWithRouter(<CarPoolingTrips />);

describe('CarPoolingTrips', () => {
  // The past-arrival filter compares fixture dates against
  // Date.now(). Pin "now" to just before the June-2026 fixtures so the suite
  // stays green regardless of the real clock when it runs.
  let nowSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    queryExtraJourneys.mockReset();
    cancelExtrajourney.mockReset();
    navigateMock.mockReset();
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-20T00:00:00.000Z').valueOf());
  });
  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('shows a loading state until the query resolves', () => {
    queryExtraJourneys.mockReturnValue(new Promise(() => {})); // never resolves

    renderInRouter();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders a row per trip with departure and destination derived from estimated calls', async () => {
    queryExtraJourneys.mockResolvedValue({ data: [trip()] });

    renderInRouter();

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const row = await screen.findByRole('row', { name: /Oslo S/ });
    expect(within(row).getByText('Oslo S')).toBeInTheDocument();
    expect(within(row).getByText('Bergen stasjon')).toBeInTheDocument();
    expect(within(row).getByText('2026-06-01 08:00')).toBeInTheDocument(); // departure
    expect(within(row).getByText('2026-06-01 15:00')).toBeInTheDocument(); // arrival
    expect(within(row).getByText('2')).toBeInTheDocument(); // stop count
  });

  it('hides ID and latest expected arrival until "Show hidden fields" is toggled', async () => {
    queryExtraJourneys.mockResolvedValue({ data: [trip()] });

    renderInRouter();

    await screen.findByRole('row', { name: /Oslo S/ });

    // Hidden by default.
    expect(screen.queryByText('2026-06-01 15:30')).not.toBeInTheDocument(); // latest expected
    expect(screen.queryByText('ENT:ServiceJourney:1')).not.toBeInTheDocument(); // ID

    await userEvent.click(screen.getByRole('checkbox', { name: /Show hidden fields/ }));

    // Revealed once toggled on.
    expect(await screen.findByText('2026-06-01 15:30')).toBeInTheDocument();
    expect(screen.getByText('ENT:ServiceJourney:1')).toBeInTheDocument();
  });

  it('filters out trips whose latest expected arrival is in the past unless toggled', async () => {
    const past = trip({
      id: 'ENT:ServiceJourney:past',
      estimatedVehicleJourney: {
        recordedAtTime: '2020-01-01T00:00:00.000Z',
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointName: 'Past departure',
              aimedDepartureTime: '2020-01-01T00:00:00.000Z',
            },
            {
              order: 2,
              stopPointName: 'Past arrival',
              aimedArrivalTime: '2020-01-01T01:00:00.000Z',
              latestExpectedArrivalTime: '2020-01-01T01:30:00.000Z',
            },
          ],
        },
      },
    } as Extrajourney);

    queryExtraJourneys.mockResolvedValue({ data: [trip(), past] });

    renderInRouter();

    await screen.findByRole('row', { name: /Oslo S/ });
    expect(screen.queryByText('Past departure')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 2 trips/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /Show completed trips/ }));

    expect(await screen.findByText('Past departure')).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 2 trips/)).toBeInTheDocument();
  });

  it('shows a Cancelled chip on rows whose trip is cancelled', async () => {
    const cancelled = trip({
      id: 'ENT:ServiceJourney:cancelled',
      estimatedVehicleJourney: {
        cancellation: true,
        recordedAtTime: '2026-05-20T09:00:00.000Z',
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointName: 'Cancelled departure',
              aimedDepartureTime: '2026-06-01T08:00:00.000Z',
            },
            {
              order: 2,
              stopPointName: 'Cancelled arrival',
              aimedArrivalTime: '2026-06-01T15:00:00.000Z',
            },
          ],
        },
      },
    } as Extrajourney);

    queryExtraJourneys.mockResolvedValue({ data: [trip(), cancelled] });

    renderInRouter();

    // Cancelled trips are hidden by default; the active trip is still shown.
    const activeRow = await screen.findByRole('row', { name: /Oslo S/ });
    expect(within(activeRow).queryByText('Cancelled')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelled departure')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /Show cancelled trips/ }));

    const cancelledRow = await screen.findByRole('row', { name: /Cancelled departure/ });
    expect(within(cancelledRow).getByText('Cancelled')).toBeInTheDocument();
  });

  it('shows a Partially cancelled chip when some but not all calls are cancelled', async () => {
    const partial = trip({
      id: 'ENT:ServiceJourney:partial',
      estimatedVehicleJourney: {
        cancellation: false,
        recordedAtTime: '2026-05-20T09:00:00.000Z',
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointName: 'Partial departure',
              aimedDepartureTime: '2026-06-01T08:00:00.000Z',
              cancellation: true,
            },
            {
              order: 2,
              stopPointName: 'Partial arrival',
              aimedArrivalTime: '2026-06-01T15:00:00.000Z',
            },
          ],
        },
      },
    } as Extrajourney);

    queryExtraJourneys.mockResolvedValue({ data: [partial] });

    renderInRouter();

    const row = await screen.findByRole('row', { name: /Partial departure/ });
    expect(within(row).getByText('Partially cancelled')).toBeInTheDocument();
  });

  it('shows Cancelled when every call is cancelled even if trip-level cancellation is false', async () => {
    const allCallsCancelled = trip({
      id: 'ENT:ServiceJourney:all-calls-cancelled',
      estimatedVehicleJourney: {
        cancellation: false,
        recordedAtTime: '2026-05-20T09:00:00.000Z',
        estimatedCalls: {
          estimatedCall: [
            {
              order: 1,
              stopPointName: 'All-cancelled departure',
              aimedDepartureTime: '2026-06-01T08:00:00.000Z',
              cancellation: true,
            },
            {
              order: 2,
              stopPointName: 'All-cancelled arrival',
              aimedArrivalTime: '2026-06-01T15:00:00.000Z',
              cancellation: true,
            },
          ],
        },
      },
    } as Extrajourney);

    queryExtraJourneys.mockResolvedValue({ data: [allCallsCancelled] });

    renderInRouter();

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    // A trip with every call cancelled counts as cancelled, so it is hidden
    // until "Show cancelled trips" is toggled on.
    expect(screen.queryByText('All-cancelled departure')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /Show cancelled trips/ }));

    const row = await screen.findByRole('row', { name: /All-cancelled departure/ });
    expect(within(row).getByText('Cancelled')).toBeInTheDocument();
    expect(within(row).queryByText('Partially cancelled')).not.toBeInTheDocument();
  });

  it('collapses the same trip returned twice (fan-out) to its latest snapshot', async () => {
    // The same trip can come back from more than one authority's query — once as
    // a stale *active* snapshot, once as the newer *cancelled* one. They share an
    // id, which the grid keys on, so the duplicate must be collapsed (keeping the
    // newest) before rendering or the cancelled copy lingers after the filter.
    const sharedId = 'TRI:ServiceJourney:dup';
    const sharedCalls = {
      estimatedCall: [
        { order: 1, stopPointName: 'Vikersund', aimedDepartureTime: '2026-06-24T13:57:00.000Z' },
        {
          order: 2,
          stopPointName: 'Hønefoss',
          aimedArrivalTime: '2026-06-24T14:28:00.000Z',
          latestExpectedArrivalTime: '2026-06-24T14:43:00.000Z',
        },
      ],
    };
    const staleActive = trip({
      id: sharedId,
      estimatedVehicleJourney: {
        cancellation: false,
        recordedAtTime: '2026-05-19T14:11:00.000Z',
        lineRef: 'TRI:CarPooling:dup',
        estimatedCalls: sharedCalls,
      },
    } as Extrajourney);
    const newerCancelled = trip({
      id: sharedId,
      estimatedVehicleJourney: {
        cancellation: true,
        recordedAtTime: '2026-05-19T14:12:00.000Z', // 1 min newer → wins
        lineRef: 'TRI:CarPooling:dup',
        estimatedCalls: sharedCalls,
      },
    } as Extrajourney);

    queryExtraJourneys.mockResolvedValue({ data: [staleActive, newerCancelled] });

    renderInRouter();

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    // Latest snapshot wins → the trip is cancelled, so with "Show cancelled" off
    // it is hidden entirely; the stale active copy must not linger. The total
    // count reflects one de-duplicated trip, not two.
    expect(screen.queryByText('Vikersund')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 0 of 1 trips/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /Show cancelled trips/ }));

    // Exactly one row for the de-duplicated trip, shown as cancelled.
    const rows = await screen.findAllByRole('row', { name: /Vikersund/ });
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Cancelled')).toBeInTheDocument();
  });

  it('opens the plan-trip form pre-filled as a duplicate when Duplicate is clicked', async () => {
    queryExtraJourneys.mockResolvedValue({ data: [trip()] });

    renderInRouter();

    const row = await screen.findByRole('row', { name: /Oslo S/ });
    await userEvent.click(within(row).getByRole('button', { name: /Duplicate/ }));

    // Reuses the edit route with ?duplicate=true so the form clones the trip
    // into a new one rather than editing it in place.
    expect(navigateMock).toHaveBeenCalledWith('/plan-trip/ENT/ENT:ServiceJourney:1?duplicate=true');
  });

  it('cancels a whole trip when the Cancel button is clicked', async () => {
    cancelExtrajourney.mockResolvedValue({ data: 'ENT:ServiceJourney:1' });
    queryExtraJourneys.mockResolvedValue({ data: [trip()] });

    renderInRouter();

    const row = await screen.findByRole('row', { name: /Oslo S/ });
    await userEvent.click(within(row).getByRole('button', { name: /^Cancel$/ }));

    await waitFor(() =>
      expect(cancelExtrajourney).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ENT:ServiceJourney:1' }),
        'ENT:Authority:ENT'
      )
    );

    // With "Show cancelled trips" off, the now-cancelled trip drops out of the
    // list and a confirmation snackbar is shown.
    expect(await screen.findByText('Trip cancelled.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Oslo S')).not.toBeInTheDocument());
  });

  it('highlights only the row for the trip just saved (carried via navigation state)', async () => {
    // Far-future times so the default past-arrival filter never hides
    // these rows regardless of the wall clock when the suite runs.
    const futureTrip = (id: string, departureName: string, arrivalName: string): Extrajourney =>
      ({
        id,
        estimatedVehicleJourney: {
          recordedAtTime: '2099-01-01T09:00:00.000Z',
          lineRef: 'ENT:CarPooling:trip',
          estimatedCalls: {
            estimatedCall: [
              {
                order: 1,
                stopPointName: departureName,
                aimedDepartureTime: '2099-01-01T08:00:00.000Z',
              },
              {
                order: 2,
                stopPointName: arrivalName,
                aimedArrivalTime: '2099-01-01T15:00:00.000Z',
                latestExpectedArrivalTime: '2099-01-01T15:30:00.000Z',
              },
            ],
          },
        },
      }) as Extrajourney;

    const other = futureTrip('ENT:ServiceJourney:other', 'Other departure', 'Other arrival');
    const saved = futureTrip(
      'ENT:ServiceJourney:saved',
      'Just-saved departure',
      'Just-saved arrival'
    );
    queryExtraJourneys.mockResolvedValue({ data: [other, saved] });

    renderWithRouter(<CarPoolingTrips />, {
      path: '/trips',
      state: { savedMessage: 'Turen ble lagret!', savedTripId: 'ENT:ServiceJourney:saved' },
    });

    const savedRow = await screen.findByRole('row', { name: /Just-saved departure/ });
    // Exactly one row is highlighted, and it's the one we just saved.
    await waitFor(() => expect(savedRow).toHaveClass('row-highlighted'));
    expect(document.querySelectorAll('.MuiDataGrid-row.row-highlighted')).toHaveLength(1);

    const otherRow = screen.getByRole('row', { name: /Other departure/ });
    expect(otherRow).not.toHaveClass('row-highlighted');
  });

  it('shows an error message when the query rejects', async () => {
    queryExtraJourneys.mockRejectedValue('boom');

    renderInRouter();

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
