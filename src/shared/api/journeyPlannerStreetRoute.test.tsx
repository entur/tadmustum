import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getStreetRoute from './journeyPlannerStreetRoute';

const URI = 'https://api.example.com/journey-planner/v3/graphql';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const pattern = (overrides: Record<string, unknown> = {}) => ({
  expectedStartTime: '2026-06-01T09:00:00.000Z',
  expectedEndTime: '2026-06-01T16:00:00.000Z',
  duration: 25200,
  distance: 463000,
  // The polyline-spec reference example: decodes to
  // [-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252].
  legs: [{ pointsOnLink: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } }],
  ...overrides,
});

describe('getStreetRoute', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fetchMock = () => globalThis.fetch as ReturnType<typeof vi.fn>;

  it('posts a car trip query with the coordinates and departure time', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ data: { trip: { tripPatterns: [] } } }));

    await getStreetRoute(URI)([10.75, 59.91], [5.32, 60.39], '2026-06-01T09:00:00.000Z');

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe(URI);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['ET-Client-Name']).toBeTruthy();
    const body = JSON.parse(init.body);
    expect(body.query).toContain('trip(');
    expect(body.query).toContain('pointsOnLink');
    expect(body.variables).toEqual({
      from: { coordinates: { latitude: 59.91, longitude: 10.75 } },
      to: { coordinates: { latitude: 60.39, longitude: 5.32 } },
      dateTime: '2026-06-01T09:00:00.000Z',
      modes: { directMode: 'car', transportModes: [] },
    });
  });

  it('maps the first trip pattern and decodes the leg geometry', async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({ data: { trip: { tripPatterns: [pattern()] } } })
    );

    const result = await getStreetRoute(URI)([10.75, 59.91], [5.32, 60.39], '2026-06-01T09:00Z');

    expect(result).toEqual({
      expectedStartTime: '2026-06-01T09:00:00.000Z',
      expectedEndTime: '2026-06-01T16:00:00.000Z',
      duration: 25200,
      distance: 463000,
      geometry: [
        [-120.2, 38.5],
        [-120.95, 40.7],
        [-126.453, 43.252],
      ],
    });
  });

  it('returns null geometry when no leg carries pointsOnLink', async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({ data: { trip: { tripPatterns: [pattern({ legs: [{}] })] } } })
    );

    const result = await getStreetRoute(URI)([10.75, 59.91], [5.32, 60.39], '2026-06-01T09:00Z');

    expect(result?.expectedEndTime).toBe('2026-06-01T16:00:00.000Z');
    expect(result?.geometry).toBeNull();
  });

  it('returns null when the journey planner finds no trip pattern', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ data: { trip: { tripPatterns: [] } } }));

    const result = await getStreetRoute(URI)([10.75, 59.91], [5.32, 60.39], '2026-06-01T09:00Z');

    expect(result).toBeNull();
  });

  it('throws on a non-OK response', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({}, 502));

    await expect(
      getStreetRoute(URI)([10.75, 59.91], [5.32, 60.39], '2026-06-01T09:00Z')
    ).rejects.toThrow('502');
  });
});
