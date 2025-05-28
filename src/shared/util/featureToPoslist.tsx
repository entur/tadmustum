import type { Feature, Polygon } from "geojson";

function featureToPoslist(feature: Feature): string {
  const outerRing = (feature?.geometry as Polygon).coordinates[0];

  return outerRing
    ? outerRing.map((coordinate) => coordinate.join(" ")).join(" \n")
    : "";
}

export default featureToPoslist;
