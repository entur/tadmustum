import type { Feature, Point } from 'geojson';
import type { ExpectedFlexibleArea } from '../../../shared/model/ExpectedFlexibleArea.tsx';
import loadCircularAreaFeature from './loadCircularAreaFeature.tsx';
import polygonCentroidAsPoint from './polygonCentroidAsPoint.tsx';

const loadFeatureFromFlexArea = (
  flexArea: ExpectedFlexibleArea | undefined
): Feature<Point> | null => {
  if (!flexArea) return null;
  // GraphQL returns absent optional fields as null, not undefined — check truthy.
  if (flexArea.circularArea) {
    return loadCircularAreaFeature(flexArea.circularArea);
  }
  if (flexArea.polygon) {
    return polygonCentroidAsPoint(flexArea.polygon);
  }
  return null;
};

export default loadFeatureFromFlexArea;
