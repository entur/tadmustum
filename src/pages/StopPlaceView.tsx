import { stopPlaceViewConfig } from '../data/stop-places/stopPlaceViewConfig.tsx';
import GenericDataViewPage from './GenericDataViewPage.tsx';
import type { StopPlace } from '../data/stop-places/stopPlaceTypes.ts';
import type { OrderBy } from '../data/stop-places/useStopPlaces.ts';

export default function StopPlaceView() {
  return <GenericDataViewPage<StopPlace, OrderBy> viewConfig={stopPlaceViewConfig} />;
}
