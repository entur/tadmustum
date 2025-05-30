import {
  Paper,
  TableContainer,
  Table,
  TableBody,
  TablePagination,
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DataTableHeader from '../components/data/DataTableHeader.tsx';
import DataTableRow from '../components/data/DataTableRow.tsx';
import { useStopPlaces } from '../data/useStopPlaces';
import { useTranslation } from 'react-i18next';

export default function DataOverviewResponsiveTable() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    data,
    totalCount,
    loading,
    error,
    order,
    orderBy,
    handleRequestSort,
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
  } = useStopPlaces();

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" mt={4}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>{t('data.loading', 'Loading data...')}</Typography>
      </Box>
    );
  if (error)
    return (
      <Alert severity="error">
        {t('data.errorPrefix', 'Error')}: {error}
      </Alert>
    );

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h3" align="center">
          {t('data.title', 'Stop Place Overview')}
        </Typography>
      </Box>
      <Box px={2} pb={2}>
        <Typography>{t('data.totalEntries', { count: totalCount })}</Typography>
      </Box>

      <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
        <Table stickyHeader>
          <DataTableHeader
            isMobile={isMobile}
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {data.map(sp => (
              <DataTableRow key={sp.id} sp={sp} isMobile={isMobile} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
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
        labelRowsPerPage={t('data.pagination.rowsPerPage', 'Rows per page:')}
        labelDisplayedRows={({ from, to, count }) => {
          // Use 'displayedRowsOfMore' if count is -1 (often indicates an estimate or more items available)
          const key =
            count === -1 ? 'data.pagination.displayedRowsOfMore' : 'data.pagination.displayedRows';
          return t(key, { from, to, count });
        }}
      />
    </Paper>
  );
}
