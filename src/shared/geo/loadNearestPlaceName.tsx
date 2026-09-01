import type { Position } from 'geojson';

export type NearestPlaceName = (position: Position) => string;

let pending: Promise<NearestPlaceName> | null = null;

/**
 * Loads the place list used to name stops (see gazetteer.tsx).
 *
 * The list is half a megabyte of text, so it is fetched as its own chunk the
 * first time a stop needs a name instead of riding along in the initial bundle.
 * The promise is kept, so the parse and the request happen once per session.
 */
export const loadNearestPlaceName = (): Promise<NearestPlaceName> => {
  pending ??= import('./gazetteer.tsx').then(module => module.nearestPlaceName);
  return pending;
};
