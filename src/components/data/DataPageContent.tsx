import { useRef } from 'react';
import { useContainerResponsiveView } from '../../hooks/useContainerResponsiveView';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import DataTableHeader from './DataTableHeader.tsx';
import DataTableRow from './DataTableRow.tsx';
import { useTranslation } from 'react-i18next';
import type { Order, OrderBy } from '../../data/useStopPlaces';

import type { StopPlace } from '../../data/StopPlaceContext.tsx';
const COMPACT_VIEW_THRESHOLD = 700;

interface DataPageContentProps {
  data: StopPlace[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  order: Order;
  orderBy: OrderBy;
  handleRequestSort: (property: OrderBy) => void;
  page: number;
  rowsPerPage: number;
  setPage: (page: number) => void;
  setRowsPerPage: (rowsPerPage: number) => void;
}

export default function DataPageContent({
  data,
  loading,
  totalCount,
  order,
  orderBy,
  handleRequestSort,
  page,
  rowsPerPage,
  setPage,
  setRowsPerPage,
}: DataPageContentProps) {
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const compact = useContainerResponsiveView(containerRef, COMPACT_VIEW_THRESHOLD, loading);

  return (
    <Box
      ref={containerRef}
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box p={2}>
        <Typography variant="h4" component="h2" align="center">
          {t('data.title', 'Stop Place Overview')}
        </Typography>
      </Box>
      <Box px={2} pb={1}>
        <Typography>{t('data.totalEntries', { count: totalCount })}</Typography>
      </Box>

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table stickyHeader>
          <DataTableHeader
            useCompactView={compact}
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {data.map(sp => (
              <DataTableRow key={`${sp.id}-${sp.version}`} sp={sp} useCompactView={compact} />
            ))}

            {data.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={compact ? 3 : 5} align="center">
                  {t('data.noResults', 'No data to display.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        sx={{
          p: 0,
          m: 0,
          flexShrink: 0,
        }}
        component="div"
        count={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={e => {
          setRowsPerPage(+e.target.value);
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage={t('data.pagination.rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) => {
          const key =
            count === -1 ? 'data.pagination.displayedRowsOfMore' : 'data.pagination.displayedRows';
          return t(key, { from, to, count });
        }}
      />
    </Box>
  );
}
