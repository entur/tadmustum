import MapboxDraw from "@mapbox/mapbox-gl-draw";

type MapboxDrawStyle = {
  id: string;
  type: "fill" | "line" | "circle";
  filter?: unknown[];
  paint: Record<string, unknown>;
};
type MapboxDrawStyles = MapboxDrawStyle[];

const _defaultStyles: MapboxDrawStyles = (MapboxDraw.lib as never)["theme"];

export const MAPBOXDRAW_DEFAULT_STYLES = _defaultStyles.map((style) => {
  if (style.id === "gl-draw-lines") {
    return {
      ...style,
      paint: {
        ...style.paint,
        "line-dasharray": ["literal", [2, 0]], // Fix for Maplibre/Mapbox GL v3+
      },
    };
  }
  return style;
});
