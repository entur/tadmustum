import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// maplibre-gl 6 loads its worker from a URL that Vite cannot follow on its own,
// so it must be handed the bundled worker before the first map is created.
setWorkerUrl(maplibreWorkerUrl);
