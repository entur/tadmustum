import { MAPBOXDRAW_DEFAULT_STYLES } from './MAPBOXDRAW_DEFAULT_STYLES.tsx';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

// A simple_select variant that disables dragging. A placed stop can still be selected and deleted
// (the trash control), but not moved: dragging only moved the marker on screen — the form's saved
// coordinates never followed — so a drag looked like it relocated the stop when it hadn't.
// No-op'ing onDrag disables both feature-drag and box-select; map panning is unaffected because the
// base map's onMouseDown/onMouseUp still toggle dragPan.
const SimpleSelectWithoutDrag = {
  ...MapboxDraw.modes.simple_select,
  onDrag() {},
};

export const MAPBOXDRAW_DEFAULT_CONSTRUCTOR = {
  defaultMode: 'simple_select',
  styles: MAPBOXDRAW_DEFAULT_STYLES,
  displayControlsDefault: false,
  controls: {
    polygon: false,
    trash: true,
  },
  modes: {
    draw_point: MapboxDraw.modes.draw_point,
    direct_select: MapboxDraw.modes.direct_select,
    simple_select: SimpleSelectWithoutDrag,
  },
};
