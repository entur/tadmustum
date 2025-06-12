import { TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material';
import type { Order, OrderBy } from '../../data/useStopPlaces.ts';
import { useTranslation } from 'react-i18next';

interface Props {
  // isMobile: boolean; // OLD
  useCompactView: boolean; // NEW
  order: Order;
  orderBy: OrderBy;
  onRequestSort: (prop: OrderBy) => void;
}

export default function DataTableHeader({
  // isMobile, // OLD
  useCompactView, // NEW
  order,
  orderBy,
  onRequestSort,
}: Props) {
  const { t } = useTranslation();

  const createLabel = (prop: OrderBy, labelKey: string, defaultLabel: string) => (
    <TableSortLabel
      active={orderBy === prop}
      direction={orderBy === prop ? order : 'asc'}
      hideSortIcon={false}
      onClick={() => onRequestSort(prop)}
    >
      {t(labelKey, defaultLabel)}
    </TableSortLabel>
  );

  return (
    <TableHead>
      <TableRow>
        {/* {isMobile && <TableCell padding="none" />} OLD */}
        {useCompactView && <TableCell padding="none" />} {/* NEW */}
        <TableCell>
          <b>
            <u>{createLabel('name', 'data.table.header.name', 'Name')}</u>
          </b>
        </TableCell>
        <TableCell>
          <b>
            <u>{createLabel('id', 'data.table.header.id', 'ID')}</u>
          </b>
        </TableCell>
        {/* {!isMobile && <TableCell>{t('data.table.header.longitude', 'Longitude')}</TableCell>} OLD */}
        {/* {!isMobile && <TableCell>{t('data.table.header.latitude', 'Latitude')}</TableCell>} OLD */}
        {/* {!isMobile && <TableCell>{t('data.table.header.type', 'Type')}</TableCell>} OLD */}
        {!useCompactView && (
          <TableCell>{t('data.table.header.longitude', 'Longitude')}</TableCell>
        )}{' '}
        {/* NEW */}
        {!useCompactView && (
          <TableCell>{t('data.table.header.latitude', 'Latitude')}</TableCell>
        )}{' '}
        {/* NEW */}
        {!useCompactView && <TableCell>{t('data.table.header.type', 'Type')}</TableCell>}{' '}
        {/* NEW */}
      </TableRow>
    </TableHead>
  );
}
