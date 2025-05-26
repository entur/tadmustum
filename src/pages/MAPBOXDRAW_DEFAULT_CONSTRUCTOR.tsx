import { MAPBOXDRAW_DEFAULT_STYLES } from "./MAPBOXDRAW_DEFAULT_STYLES.tsx";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

export const MAPBOXDRAW_DEFAULT_CONSTRUCTOR = {
  defaultMode: "simple_select",
  styles: MAPBOXDRAW_DEFAULT_STYLES,
  displayControlsDefault: false,
  controls: {
    polygon: false,
    trash: true,
  },
  modes: {
    draw_polygon: MapboxDraw.modes.draw_polygon,
    direct_select: MapboxDraw.modes.direct_select,
    simple_select: MapboxDraw.modes.simple_select,
  },
};
