import type { Feature, Polygon } from 'geojson';
import { nanoid } from 'nanoid';

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

const loadFeatureUtil = (polygonJson: { posList: string }): Feature<Polygon> => {
  const coordinates = [posListToCoordinates(polygonJson.posList)];
  return {
    type: 'Feature',
    id: nanoid(),
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates,
    },
  };
};

export default loadFeatureUtil;
