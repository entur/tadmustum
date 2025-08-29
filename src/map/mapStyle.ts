import type { StyleSpecification } from 'maplibre-gl';
import type { Theme } from '@mui/material/styles';
import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';

export const LAYER_ID_OSM_RASTER = 'osm-raster-tiles';
export const LAYER_ID_STOPS_CIRCLE = 'stops-circle';
export const LAYER_ID_STOPS_ICON = 'stops-icon';
export const LAYER_ID_STOPS_TEXT = 'stops-text';

export function createMapStyle(theme: Theme): StyleSpecification {
  const existingLayers: LayerSpecification[] = [
    {
      id: LAYER_ID_OSM_RASTER,
      type: 'raster' as const,
      source: 'osm',
    },
  ];

  const stopPlaceLayers: LayerSpecification[] = [
    {
      id: LAYER_ID_STOPS_CIRCLE,
      type: 'circle' as const,
      source: 'stops',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 8, 3, 16, 25],
        'circle-color':
          theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
        'circle-stroke-width': 1,
        'circle-stroke-color':
          theme.palette.mode === 'dark'
            ? theme.palette.secondary.light
            : theme.palette.secondary.main,
        'circle-opacity': 0.6,
      },
    },
    {
      id: LAYER_ID_STOPS_ICON,
      type: 'symbol' as const,
      source: 'stops',
      minzoom: 10,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.15, 12, 0.2, 16, 0.4],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    },
    {
      id: LAYER_ID_STOPS_TEXT,
      type: 'symbol' as const,
      source: 'stops',
      minzoom: 10,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2.8],
        'text-anchor': 'top',
        'text-size': 10,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color':
          theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.primary,
        'text-halo-color':
          theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : theme.palette.background.paper,
        'text-halo-width': 6,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 13.01, 1],
      },
    },
  ];

  return {
    version: 8,
    name: 'Inanna Map Style (Zoom‐Dependent)',
    glyphs: theme.typography.fontFamily
      ? `https://fonts.openmaptiles.org/{fontstack}/{range}.pbf`
      : 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
        maxzoom: 19,
      },
      stops: {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      },
    },

    layers: [...existingLayers, ...stopPlaceLayers],
  };
}
