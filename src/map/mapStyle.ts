// src/map/mapStyle.ts

import type { StyleSpecification } from 'maplibre-gl';
import type { Theme } from '@mui/material/styles';
import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';

export function createMapStyle(theme: Theme): StyleSpecification {
  // 1) Any existing base layers (e.g., OSM raster)
  const existingLayers: LayerSpecification[] = [
    {
      id: 'osm-raster-tiles',
      type: 'raster' as const,
      source: 'osm',
    },
  ];

  // 2) Stop‐place layers (dynamic, zoom‐dependent)
  const stopPlaceLayers: LayerSpecification[] = [
    // 2a. Circle layer (always visible, but radius interpolates with zoom)
    {
      id: 'stops-circle-fallback',
      type: 'circle' as const,
      source: 'stops', // this must match your GeoJSON source ID
      paint: {
        // At zoom 0 → radius 1px; at zoom 8 → radius 3px; at zoom 16 → radius 8px
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
    // 2b. Symbol (icon + optional text) — only at zoom ≥ 8
    {
      id: 'stops-symbol',
      type: 'symbol' as const,
      source: 'stops', // same GeoJSON source
      minzoom: 10, // do not render icons below zoom 8
      layout: {
        // Use the feature’s “icon” property (registered by your RegisterIcons)
        'icon-image': ['get', 'icon'],

        // Interpolate icon size: at zoom 8 → 0.2, zoom 12 → 0.5, zoom 16 → 1.0
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.15, 12, 0.2, 16, 0.4],

        'icon-allow-overlap': true,
        'icon-ignore-placement': true,

        // (Optional) text label beneath each icon:
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2.8],
        'text-anchor': 'top',
        'text-size': 10,
        'text-allow-overlap': true,
        // You could also hide text until zoom > 12 by adding `text-opacity` in layout,
        // but here we’ll keep paint‐based opacity interpolation below.
      },
      paint: {
        'text-color':
          theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.primary,
        'text-halo-color':
          theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : theme.palette.background.paper,
        'text-halo-width': 6,
        // Keep your existing text opacity rule:
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 13.01, 1],
      },
    },
  ];

  return {
    version: 8,
    name: 'Inanna Map Style (Zoom‐Dependent)',
    // Glyphs endpoint (remains unchanged)
    glyphs: theme.typography.fontFamily
      ? `https://fonts.openmaptiles.org/{fontstack}/{range}.pbf`
      : 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',

    sources: {
      // 1) Basemap (OpenStreetMap raster)
      osm: {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
        maxzoom: 19,
      },
      // 2) Stops—initially empty; will be replaced/updated by your MapView via GeoJSON
      stops: {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      },
    },

    layers: [
      ...existingLayers,
      // Insert the stops‐circle layer first, then symbol on top
      ...stopPlaceLayers,
    ],
  };
}
