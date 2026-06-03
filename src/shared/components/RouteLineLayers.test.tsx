import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Feature, LineString } from 'geojson';
import type { ComponentProps, ReactNode } from 'react';

// Stub react-map-gl so the layers render as inspectable DOM nodes instead of
// requiring a WebGL map context (unavailable under jsdom).
vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children, data }: { children: ReactNode; data: unknown }) => (
    <div data-testid="source" data-geojson={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Layer: (props: { id: string; paint: Record<string, unknown> }) => (
    <div data-testid={props.id} data-paint={JSON.stringify(props.paint)} />
  ),
}));

import RouteLineLayers from './RouteLineLayers';

const fallbackLine: Feature<LineString> = {
  type: 'Feature',
  properties: { type: 'route' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [10, 59],
      [11, 60],
    ],
  },
};

const legs = [
  [
    [10, 59],
    [10.4, 59.6],
    [10.5, 59.5],
  ],
  [
    [10.5, 59.5],
    [11, 60],
  ],
];

const renderLayers = (legGeometries: ComponentProps<typeof RouteLineLayers>['legGeometries']) =>
  render(<RouteLineLayers legGeometries={legGeometries} fallbackLine={fallbackLine} />);

describe('RouteLineLayers', () => {
  it('draws the routed legs as a solid cased line', () => {
    renderLayers(legs);

    const geojson = JSON.parse(screen.getByTestId('source').dataset.geojson!);
    expect(geojson.geometry).toEqual({ type: 'MultiLineString', coordinates: legs });

    expect(screen.getByTestId('route-line-casing')).toBeInTheDocument();
    const paint = JSON.parse(screen.getByTestId('route-line').dataset.paint!);
    expect(paint['line-dasharray']).toBeUndefined();
  });

  it("draws the dashed fallback line when routing failed ('failed')", () => {
    renderLayers('failed');

    const geojson = JSON.parse(screen.getByTestId('source').dataset.geojson!);
    expect(geojson.geometry.type).toBe('LineString');

    const paint = JSON.parse(screen.getByTestId('route-line').dataset.paint!);
    expect(paint['line-dasharray']).toEqual([2, 2]);
  });

  it('draws nothing while no route exists yet (null)', () => {
    renderLayers(null);

    expect(screen.queryByTestId('source')).not.toBeInTheDocument();
  });

  it('draws nothing when the routed legs are all degenerate', () => {
    renderLayers([[[10, 59]]]);

    expect(screen.queryByTestId('source')).not.toBeInTheDocument();
  });
});
