import type { Feature, Point } from 'geojson';
import { nanoid } from 'nanoid';
import type { Polygon } from '../../../shared/model/Polygon.tsx';

const centerOfPolygon = (polygon: Polygon): number[] => {
  const coords = posListToCoordinates(polygon.exterior.posList);
  let totalLng = 0,
    totalLat = 0;
  coords.forEach(coord => {
    totalLng += coord[0];
    totalLat += coord[1];
  });
  const centerLng = totalLng / coords.length;
  const centerLat = totalLat / coords.length;

  return [centerLng, centerLat];
};

const posListToCoordinates = (posList: string): number[][] => {
  // Split by whitespace, filter out empty strings, and parse as floats
  const numbers = posList.trim().split(/\s+/).map(Number);

  // Group into pairs [lon, lat]
  const coordinates: number[][] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    coordinates.push([numbers[i], numbers[i + 1]]);
  }
  return coordinates;
};

const polygonCentroidAsPoint = (polygon: Polygon): Feature<Point> => {
  const center = centerOfPolygon(polygon);

  // When converting, will introduce inaccuracies, but user can edit it
  return {
    type: 'Feature',
    id: nanoid(),
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: center,
    },
  };
};

export default polygonCentroidAsPoint;
