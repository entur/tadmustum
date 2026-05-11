import type { Feature, Point } from 'geojson';
import { nanoid } from 'nanoid';
import type { CircularArea } from '../../../shared/model/CircularArea.tsx';
import { decodeCircularAreaAsPoint } from '../../../shared/model/circularAreaCodec.tsx';

const loadCircularAreaFeature = (circularArea: CircularArea): Feature<Point> => {
  return {
    type: 'Feature',
    id: nanoid(),
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: decodeCircularAreaAsPoint(circularArea),
    },
  };
};

export default loadCircularAreaFeature;
