import { TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material';
import type { Order, OrderBy } from '../../data/useStopPlaces.ts';
import { useTranslation } from 'react-i18next';

interface Props {
  isMobile: boolean;
  order: Order;
  orderBy: OrderBy;
  onRequestSort: (prop: OrderBy) => void;
}

export default function DataTableHeader({ isMobile, order, orderBy, onRequestSort }: Props) {
  const { t } = useTranslation(); // Initialize

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
        {isMobile && <TableCell padding="none" />}
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
        {!isMobile && <TableCell>{t('data.table.header.longitude', 'Longitude')}</TableCell>}
        {!isMobile && <TableCell>{t('data.table.header.latitude', 'Latitude')}</TableCell>}
        {!isMobile && <TableCell>{t('data.table.header.type', 'Type')}</TableCell>}
      </TableRow>
    </TableHead>
  );
}
