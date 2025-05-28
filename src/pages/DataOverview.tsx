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

export default function DataOverviewResponsiveTable() {
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
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h3" align="center">
          Data display
        </Typography>
      </Box>
      <Box px={2} pb={2}>
        <Typography>Total entries: {totalCount}</Typography>
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
      />
    </Paper>
  );
}
