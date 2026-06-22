import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { renderWithRouter } from '../../../test/renderWithRouter';
import prepareCarpoolingFormData from '../../../shared/api/prepareCarpoolingFormData';
import type { CarPoolingTripDataFormData } from '../model/CarPoolingTripDataFormData';
import type { Extrajourney } from '../../../shared/model/Extrajourney';

const queryOneExtraJourney = vi.fn();

vi.mock('../hooks/useQueryOneExtraJourney', () => ({
  useQueryExtraJourney: () => queryOneExtraJourney,
}));

// Stable mutation mock so the duplicate test can assert what gets saved.
const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../hooks/useMutateExtrajourney', () => ({
  useMutateExtrajourney: () => mutate,
}));

// useAuthorities pairs codespaces to NeTEx authority ids; the component waits
// for the matching authority before issuing the trip query, so the test needs
// to supply one. Real lookups go through OIDC + GraphQL.
vi.mock('../../../shared/hooks/useAuthorities', () => ({
  useAuthorities: () => ({
    authorities: [{ id: 'ENT:Authority:ENT', name: 'Entur' }],
    allowedCodespaces: [{ id: 'ENT', permissions: ['ADMIN_CARPOOLING_DATA'] }],
  }),
}));

// Stub the heavy form (MUI fields, date pickers, schema). The reset/identity
// logic lives in CarPoolingTripData, so we expose the pre-filled initialState
// and a way to fire onReset/onSubmit, plus whether a trip was loaded.
vi.mock('./CarPoolingTripDataForm', () => ({
  default: (props: {
    onResetCallback: () => void;
    onSubmitCallback: (data: CarPoolingTripDataFormData) => void;
    initialState?: CarPoolingTripDataFormData;
    tripData: unknown;
  }) => (
    <div>
      <button onClick={() => props.onResetCallback()}>reset</button>
      <button onClick={() => props.onSubmitCallback(props.initialState!)}>submit</button>
      <span data-testid="editing">{props.tripData ? 'yes' : 'no'}</span>
      <span data-testid="trip-id">{props.initialState?.id ?? 'none'}</span>
      <span data-testid="code">{props.initialState?.estimatedVehicleJourneyCode ?? 'none'}</span>
      <span data-testid="line-ref">{props.initialState?.lineRef ?? 'none'}</span>
    </div>
  ),
}));

import CarPoolingTripData from './CarPoolingTripData';

const TRIP_ID = 'ENT:ServiceJourney:42';

// A valid Extrajourney with two flexible stops, built by round-tripping a form
// through the real SIRI mapper so the flexible areas decode back into features.
const journeyFixture = (): Extrajourney => {
  const form: CarPoolingTripDataFormData = {
    authority: 'ENT:Authority:ENT',
    operator: 'ENT:Operator:1',
    id: TRIP_ID,
    departureStopName: 'Oslo S',
    departureDatetime: dayjs('2026-06-01T08:00:00.000Z'),
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
  };
  return prepareCarpoolingFormData(form).input as Extrajourney;
};

const mapCallbacks = () => ({
  onAddFlexibleStop: vi.fn(),
  onRemoveFlexibleStop: vi.fn(),
  onRemoveAllFlexibleStops: vi.fn(),
  onZoomToFeature: vi.fn(),
  onZoomToAllFeatures: vi.fn(),
  loadedFlexibleStop: vi.fn(),
  onDepartureStopChange: vi.fn(),
  onArrivalStopChange: vi.fn(),
});

describe('CarPoolingTripData reset behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores the loaded trip on reset when editing', async () => {
    queryOneExtraJourney.mockResolvedValue({ data: { extraJourney: journeyFixture() } });
    const props = mapCallbacks();

    renderWithRouter(<CarPoolingTripData tripId={TRIP_ID} codespace="ENT" {...props} />);

    // Initial load draws the trip's stops onto the map.
    await waitFor(() => expect(props.loadedFlexibleStop).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('editing')).toHaveTextContent('yes');

    props.loadedFlexibleStop.mockClear();
    fireEvent.click(screen.getByText('reset'));

    // The map is cleared and then the original stops are reloaded (restored).
    expect(props.onRemoveAllFlexibleStops).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(props.loadedFlexibleStop).toHaveBeenCalledTimes(1));
  });

  it('clears the map on reset when creating a new trip', async () => {
    const props = mapCallbacks();

    renderWithRouter(<CarPoolingTripData {...props} />);

    expect(queryOneExtraJourney).not.toHaveBeenCalled();
    expect(screen.getByTestId('editing')).toHaveTextContent('no');

    fireEvent.click(screen.getByText('reset'));

    // No trip to restore: the map is wiped and nothing is reloaded.
    expect(props.onRemoveAllFlexibleStops).toHaveBeenCalledTimes(1);
    expect(props.loadedFlexibleStop).not.toHaveBeenCalled();
  });
});

describe('CarPoolingTripData duplicate behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-fills from the source trip but mints a fresh identity', async () => {
    queryOneExtraJourney.mockResolvedValue({ data: { extraJourney: journeyFixture() } });
    const props = mapCallbacks();

    renderWithRouter(<CarPoolingTripData tripId={TRIP_ID} codespace="ENT" duplicate {...props} />);

    // The source trip is still loaded (its stops are drawn) to pre-fill the form.
    await waitFor(() => expect(props.loadedFlexibleStop).toHaveBeenCalledTimes(1));

    // ...but its identity is replaced: the source id is dropped and a fresh
    // journey code / lineRef are minted under the same codespace.
    expect(screen.getByTestId('trip-id')).toHaveTextContent('none');
    const code = screen.getByTestId('code').textContent ?? '';
    const lineRef = screen.getByTestId('line-ref').textContent ?? '';
    expect(code).toMatch(/^ENT:ServiceJourney:/);
    expect(code).not.toBe(TRIP_ID);
    expect(lineRef).toMatch(/^ENT:CarPooling:/);
  });

  it('saves as a new trip rather than overwriting the source on submit', async () => {
    queryOneExtraJourney.mockResolvedValue({ data: { extraJourney: journeyFixture() } });
    mutate.mockResolvedValue({ data: 'ENT:ServiceJourney:new' });
    const props = mapCallbacks();

    renderWithRouter(<CarPoolingTripData tripId={TRIP_ID} codespace="ENT" duplicate {...props} />);

    await waitFor(() => expect(props.loadedFlexibleStop).toHaveBeenCalledTimes(1));
    const code = screen.getByTestId('code').textContent ?? '';

    fireEvent.click(screen.getByText('submit'));

    // The mutation must carry no id (so nunamnir creates a new trip) and the
    // freshly-minted code — never the source id, which would overwrite it.
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const saved = mutate.mock.calls[0][0] as CarPoolingTripDataFormData;
    expect(saved.id).toBeUndefined();
    expect(saved.estimatedVehicleJourneyCode).toBe(code);
  });
});
