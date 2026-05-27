import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Extrajourney } from '../../shared/model/Extrajourney';
import { renderWithRouter } from '../../test/renderWithRouter';
import CarPoolingTrips from './CarPoolingTrips';

const queryExtraJourneys = vi.fn();

vi.mock('./hooks/useQueryExtraJourney.tsx', () => ({
  useQueryExtraJourney: () => queryExtraJourneys,
}));

const trip = (overrides: Partial<Extrajourney> = {}): Extrajourney =>
  ({
    id: 'ENT:ServiceJourney:1',
    estimatedVehicleJourney: {
      recordedAtTime: '2026-05-20T09:00:00.000Z',
      expiresAtEpochMs: new Date('2099-01-01').valueOf(),
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

  it('hides ID, latest expected arrival, and expires-at until "Show hidden fields" is toggled', async () => {
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
        expiresAtEpochMs: new Date('2099-01-01').valueOf(),
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
        expiresAtEpochMs: new Date('2099-01-01').valueOf(),
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

    const cancelledRow = await screen.findByRole('row', { name: /Cancelled departure/ });
    expect(within(cancelledRow).getByText('Cancelled')).toBeInTheDocument();

    const activeRow = await screen.findByRole('row', { name: /Oslo S/ });
    expect(within(activeRow).queryByText('Cancelled')).not.toBeInTheDocument();
  });

  it('shows a Partially cancelled chip when some but not all calls are cancelled', async () => {
    const partial = trip({
      id: 'ENT:ServiceJourney:partial',
      estimatedVehicleJourney: {
        cancellation: false,
        recordedAtTime: '2026-05-20T09:00:00.000Z',
        expiresAtEpochMs: new Date('2099-01-01').valueOf(),
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
        expiresAtEpochMs: new Date('2099-01-01').valueOf(),
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

    const row = await screen.findByRole('row', { name: /All-cancelled departure/ });
    expect(within(row).getByText('Cancelled')).toBeInTheDocument();
    expect(within(row).queryByText('Partially cancelled')).not.toBeInTheDocument();
  });

  it('shows an error message when the query rejects', async () => {
    queryExtraJourneys.mockRejectedValue('boom');

    renderInRouter();

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
