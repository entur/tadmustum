import {
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

import { Sidebar } from '../components/Sidebar.tsx';
import { ToggleButton } from '../components/ToggleButton.tsx';
import { useResizableSidebar } from '../hooks/useResizableSidebar.ts';

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

  const {
    width: sidebarWidth,
    collapsed: sidebarCollapsed,
    setIsResizing: setIsSidebarResizing,
    toggle: toggleSidebar,
  } = useResizableSidebar(250);

  if (loading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        mt={4}
        sx={{ p: 2 }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>{t('data.loading', 'Loading data...')}</Typography>
      </Box>
    );
  if (error)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          {t('data.errorPrefix', 'Error')}: {error}
        </Alert>
      </Box>
    );

  // Main content (the table)
  const tableContent = (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box p={2}>
        {' '}
        <Typography variant="h4" component="h2" align="center">
          {t('data.title', 'Stop Place Overview')}
        </Typography>
      </Box>
      <Box px={2} pb={1}>
        {' '}
        <Typography>{t('data.totalEntries', { count: totalCount })}</Typography>
      </Box>

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        {' '}
        <Table stickyHeader>
          <DataTableHeader
            isMobile={isMobile}
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {data.map(sp => (
              <DataTableRow key={`${sp.id}-${sp.version}`} sp={sp} isMobile={isMobile} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        sx={{
          p: 0, // Keep padding and margin as you like, or remove if not needed
          m: 0,
          flexShrink: 0, // Crucial: Prevents the pagination from shrinking
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
        labelRowsPerPage={t('data.pagination.rowsPerPage', 'Rows per page:')}
        labelDisplayedRows={({ from, to, count }) => {
          const key =
            count === -1 ? 'data.pagination.displayedRowsOfMore' : 'data.pagination.displayedRows';
          return t(key, { from, to, count });
        }}
      />
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)', // Assuming 64px is your AppBar height
        position: 'relative',
      }}
    >
      <Sidebar
        width={sidebarWidth}
        collapsed={sidebarCollapsed}
        onMouseDownResize={() => setIsSidebarResizing(true)}
        theme={theme}
        toggleCollapse={toggleSidebar}
      />
      <ToggleButton
        collapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        theme={theme}
        onClick={toggleSidebar}
      />
      <Box
        className="data-overview-content"
        sx={{
          flexGrow: 1,
          height: '100%',
          marginLeft: sidebarCollapsed ? '0px' : `${sidebarWidth + 4}px`, // +4 for resizer
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          // borderWidth: 0, // Your previous style, can be removed if not needed
        }}
      >
        {tableContent}
      </Box>
    </Box>
  );
}
