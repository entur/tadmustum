import { useRef, useState, useEffect } from 'react'; // Added React
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
} from '@mui/material';
import DataTableHeader from '../components/data/DataTableHeader.tsx';
import DataTableRow from '../components/data/DataTableRow.tsx';
import { useStopPlaces } from '../data/useStopPlaces';
import { useTranslation } from 'react-i18next';

import { Sidebar } from '../components/Sidebar.tsx';
import { ToggleButton } from '../components/ToggleButton.tsx';
import { useResizableSidebar } from '../hooks/useResizableSidebar.ts';

const COMPACT_VIEW_THRESHOLD = 700; // Adjusted for more typical testing, you can set it back to 1500

export default function DataOverview() {
  const { t } = useTranslation();
  const theme = useTheme();

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

  const tableContentContainerRef = useRef<HTMLDivElement | null>(null);
  const [tableContainerWidth, setTableContainerWidth] = useState(0);

  useEffect(() => {
    // If still loading, the ref target element might not exist yet.
    // The effect will re-run when loading becomes false.
    if (loading) {
      // Optional: Clear width if it should be 0 during loading
      // if (tableContainerWidth !== 0) setTableContainerWidth(0);
      return;
    }

    const contentElement = tableContentContainerRef.current;
    if (!contentElement) {
      // This case should ideally not be hit if loading is false and the JSX is structured correctly.
      console.warn(
        '[DataOverview] tableContentContainerRef.current is null even after loading is false. Ensure the ref is attached to a rendered element.'
      );
      return;
    }

    // Log that we are about to set up the observer and the element's initial state
    console.log('[DataOverview] Attempting to observe contentElement:', contentElement);
    console.log('[DataOverview] Initial contentElement.offsetWidth:', contentElement.offsetWidth);
    console.log('[DataOverview] Initial contentElement.offsetHeight:', contentElement.offsetHeight);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        // This is the log we expect to see when the observer fires
        console.log('[DataOverview] ResizeObserver Fired! Width:', entry.contentRect.width);
        setTableContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(contentElement);

    // The ResizeObserver should fire shortly after observe() if the element is rendered
    // and has non-zero dimensions. It will provide the initial width.
    // If you find tableContainerWidth remains 0, it implies the element might have 0 width
    // when first observed, or there's another layout issue.

    return () => {
      console.log('[DataOverview] Cleaning up: Unobserving contentElement:', contentElement);
      // The contentElement in the closure of the cleanup function
      // will be the same one that was observed.
      resizeObserver.unobserve(contentElement);
      resizeObserver.disconnect(); // Important to prevent memory leaks
    };
  }, [loading]); // Key Change: Added `loading` to the dependency array.
  // This ensures the effect re-runs when `loading` changes.

  const shouldUseCompactView =
    tableContainerWidth < COMPACT_VIEW_THRESHOLD && tableContainerWidth > 0;

  // Log current state on each render for easier debugging
  console.log(
    `[DataOverview] Render State: tableContainerWidth=${tableContainerWidth}, COMPACT_VIEW_THRESHOLD=${COMPACT_VIEW_THRESHOLD}, shouldUseCompactView=${shouldUseCompactView}, loading=${loading}`
  );

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
            useCompactView={shouldUseCompactView}
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {data.map(sp => (
              <DataTableRow
                key={`${sp.id}-${sp.version}`}
                sp={sp}
                useCompactView={shouldUseCompactView}
              />
            ))}
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
        height: 'calc(100vh - 64px)',
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
        ref={tableContentContainerRef} // Assign the ref here
        className="data-overview-content"
        sx={{
          flexGrow: 1,
          height: '100%',
          marginLeft: sidebarCollapsed ? '0px' : `${sidebarWidth + 4}px`,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {tableContent}
      </Box>
    </Box>
  );
}
