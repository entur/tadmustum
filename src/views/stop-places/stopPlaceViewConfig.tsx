import { Box } from '@mui/material';
import { useStopPlaces } from '../../data/useStopPlaces';
import { useDataViewSearch } from '../../hooks/useDataViewSearch';
import { useDataViewTableLogic } from '../../hooks/useDataViewTableLogic';
import DataPageContent from '../../components/data/DataPageContent';
import type { ColumnDefinition } from '../../components/data/dataTableTypes.ts';
import type { StopPlace } from '../../data/StopPlaceContext.tsx';
import { getIconUrl } from '../../utils/iconLoaderUtils.ts';
import type { OrderBy } from '../../data/useStopPlaces.ts';
import EditActionCell from './cells/EditActionCell.tsx';
import GoToMapCell from './cells/GoToMapCell.tsx';

/**
 * Defines the columns for the StopPlace data table, now with responsive display properties.
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

export const stopPlaceViewConfig = {
  useData: useStopPlaces,
  useSearchRegistration: useDataViewSearch,
  useTableLogic: useDataViewTableLogic,
  PageContentComponent: DataPageContent,
  columns: stopPlaceColumns,
};
