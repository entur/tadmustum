import { Box } from '@mui/material';
import { useStopPlaces } from './useStopPlaces.ts';
import { useDataViewSearch } from '../../hooks/useDataViewSearch';
import { useDataViewTableLogic } from '../../hooks/useDataViewTableLogic';
import DataPageContent from '../../components/data/DataPageContent';
import type { ColumnDefinition } from '../../components/data/dataTableTypes.ts';
import type { StopPlace } from './stopPlaceTypes.ts';
import { getIconUrl } from '../../utils/iconLoaderUtils.ts';
import type { OrderBy } from './useStopPlaces.ts';
import EditActionCell from './cells/EditActionCell.tsx';
import GoToMapCell from './cells/GoToMapCell.tsx';
import type { FilterDefinition } from '../../components/search/searchTypes.ts';

/**
 * Defines the columns for the StopPlace data table.
 */
const stopPlaceColumns: ColumnDefinition<StopPlace, OrderBy>[] = [
  {
    id: 'name',
    headerLabel: 'Name',
    isSortable: true,
    renderCell: item => item.name.value,
    display: 'always',
  },
  {
    id: 'id',
    headerLabel: 'ID',
    isSortable: true,
    renderCell: item => item.id,
    display: 'always',
  },
  {
    id: 'type',
    headerLabel: 'Type',
    isSortable: false,
    renderCell: item => {
      const iconKey =
        item.__typename === 'ParentStopPlace' ? 'parentStopPlace' : item.stopPlaceType;
      return (
        <Box
          component="img"
          src={getIconUrl(iconKey)}
          alt="Stop place type icon"
          sx={{ width: 32 }}
        />
      );
    },
    display: 'desktop-only',
  },
  {
    id: 'longitude',
    headerLabel: 'Longitude',
    isSortable: false,
    renderCell: item => item.geometry.legacyCoordinates?.[0]?.[0] ?? '—',
    display: 'desktop-only',
  },
  {
    id: 'latitude',
    headerLabel: 'Latitude',
    isSortable: false,
    renderCell: item => item.geometry.legacyCoordinates?.[0]?.[1] ?? '—',
    display: 'desktop-only',
  },
  {
    id: 'goToMap',
    headerLabel: 'Map',
    isSortable: false,
    align: 'center',
    renderCell: item => <GoToMapCell item={item} />,
    display: 'desktop-only',
  },
  {
    id: 'actions',
    headerLabel: 'Actions',
    align: 'center',
    renderCell: item => <EditActionCell item={item} />,
    display: 'always',
  },
];

/**
 * A function to extract the key used for filtering StopPlaces by type.
 */
const getStopPlaceFilterKey = (item: StopPlace): string => {
  return item.__typename === 'ParentStopPlace' ? 'parentStopPlace' : item.stopPlaceType;
};

/**
 * A function to get the specific value from a StopPlace for sorting.
 */
const getStopPlaceSortValue = (item: StopPlace, key: OrderBy): string | number => {
  switch (key) {
    case 'name':
      return item.name.value;
    case 'id':
      return item.id;
    default:
      return '';
  }
};
const stopPlaceFilters: FilterDefinition[] = [
  { id: 'parentStopPlace', labelKey: 'types.parent', defaultLabel: 'Parent Stop Place' },
  { id: 'railStation', labelKey: 'types.train', defaultLabel: 'Train' },
  { id: 'metroStation', labelKey: 'types.metro', defaultLabel: 'Metro' },
  { id: 'onstreetBus', labelKey: 'types.bus', defaultLabel: 'Bus' },
  { id: 'onstreetTram', labelKey: 'types.tram', defaultLabel: 'Tram' },
  { id: 'ferryStop', labelKey: 'types.ferry', defaultLabel: 'Ferry' },
  { id: 'harbourPort', labelKey: 'types.harbour', defaultLabel: 'Harbour' },
  { id: 'liftStation', labelKey: 'types.lift', defaultLabel: 'Lift' },
];
export const stopPlaceViewConfig = {
  useData: useStopPlaces,
  useSearchRegistration: useDataViewSearch,
  useTableLogic: useDataViewTableLogic,
  PageContentComponent: DataPageContent,
  columns: stopPlaceColumns,
  getFilterKey: getStopPlaceFilterKey,
  getSortValue: getStopPlaceSortValue,
  filters: stopPlaceFilters,
};
