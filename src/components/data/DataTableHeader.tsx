import { TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material';
import type { Order, OrderBy } from '../../data/useStopPlaces.ts';

interface Props {
  isMobile: boolean;
  order: Order;
  orderBy: OrderBy;
  onRequestSort: (prop: OrderBy) => void;
}

export default function DataTableHeader({ isMobile, order, orderBy, onRequestSort }: Props) {
  const createLabel = (prop: OrderBy, label: string) => (
    <TableSortLabel
      active={orderBy === prop}
      direction={orderBy === prop ? order : 'asc'}
      hideSortIcon={false}
      onClick={() => onRequestSort(prop)}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <TableHead>
      <TableRow>
        {isMobile && <TableCell padding="none" />}
        <TableCell>
          <b>
            <u>{createLabel('name', 'Name')}</u>
          </b>
        </TableCell>
        <TableCell>
          <b>
            <u>{createLabel('id', 'ID')}</u>
          </b>
        </TableCell>
        {!isMobile && <TableCell>Longitude</TableCell>}
        {!isMobile && <TableCell>Latitude</TableCell>}
        {!isMobile && <TableCell>Type</TableCell>}
      </TableRow>
    </TableHead>
  );
}
