import { useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, useTheme } from '@mui/material';
import { useStopPlaces } from '../data/useStopPlaces';
import type { StopPlace } from '../data/StopPlaceContext';
import { useSearch } from '../components/search';
import type { SearchResultItem, SearchContextViewType } from '../components/search/searchTypes';

import { Sidebar } from '../components/sidebar/Sidebar.tsx';
import { ToggleButton } from '../components/sidebar/ToggleButton.tsx';
import { useResizableSidebar } from '../hooks/useResizableSidebar.ts';
import DataPageContent from '../components/data/DataPageContent.tsx';
import LoadingPage from '../components/common/LoadingPage.tsx';
import ErrorPage from '../components/common/ErrorPage.tsx';

export default function DataView() {
  const theme = useTheme();

  const {
    width: sidebarWidth,
    collapsed: sidebarCollapsed,
    setIsResizing: setIsSidebarResizing,
    toggle: toggleSidebar,
  } = useResizableSidebar(250, true);

  const tableContentContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    allData: allFetchedStopPlaces,
    totalCount: originalTotalCount,
    loading: stopPlacesLoading,
    error: stopPlacesError,
    order,
    orderBy,
    handleRequestSort,
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
  } = useStopPlaces();

  const {
    setActiveSearchContext,
    registerSearchFunction,
    searchResults,
    searchQuery,
    activeSearchContext,
    selectedItem,
  } = useSearch();

  const searchStopPlaceData = useCallback(
    async (query: string, filters: string[]): Promise<SearchResultItem[]> => {
      if (stopPlacesLoading || !allFetchedStopPlaces) return [];
      const lowerQuery = query.toLowerCase();
      const results = allFetchedStopPlaces
        .filter(sp => {
          const textMatch =
            sp.name.value.toLowerCase().includes(lowerQuery) ||
            sp.id.toLowerCase().includes(lowerQuery);

          const typeKey =
            sp.__typename === 'ParentStopPlace' ? 'parentStopPlace' : sp.stopPlaceType;
          const typeMatch = filters.length === 0 || filters.includes(typeKey);

          return textMatch && typeMatch;
        })
        .map(sp => ({
          id: sp.id,
          name: sp.name.value,
          type: 'data' as const,
          originalData: sp,
        }));
      return results;
    },
    [stopPlacesLoading, allFetchedStopPlaces]
  );

  useEffect(() => {
    setActiveSearchContext('data' as SearchContextViewType);

    registerSearchFunction('data' as SearchContextViewType, searchStopPlaceData);

    return () => {
      registerSearchFunction('data' as SearchContextViewType, null);
    };
  }, [setActiveSearchContext, registerSearchFunction, searchStopPlaceData]);

  const { dataForTable, currentTotalForTable } = useMemo(() => {
    let baseData: StopPlace[];
    let currentTotal: number;
    const isDataSearchActive = activeSearchContext === 'data';

    if (isDataSearchActive && selectedItem) {
      baseData = [selectedItem.originalData as StopPlace];
      currentTotal = 1;
    } else if (isDataSearchActive && searchQuery.trim()) {
      baseData = searchResults
        .filter(result => result.type === 'data' && result.originalData)
        .map(result => result.originalData as StopPlace);
      currentTotal = baseData.length;
    } else {
      baseData = allFetchedStopPlaces;
      currentTotal = originalTotalCount;
    }

    let sortedData = baseData;
    if (isDataSearchActive && (searchQuery.trim() || selectedItem)) {
      sortedData = [...baseData].sort((a, b) => {
        const valA = orderBy === 'name' ? a.name.value.toLowerCase() : a.id.toLowerCase();
        const valB = orderBy === 'name' ? b.name.value.toLowerCase() : b.id.toLowerCase();
        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const paginated = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return { dataForTable: paginated, currentTotalForTable: currentTotal };
  }, [
    activeSearchContext,
    searchQuery,
    searchResults,
    selectedItem,
    allFetchedStopPlaces,
    originalTotalCount,
    order,
    orderBy,
    page,
    rowsPerPage,
  ]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, activeSearchContext, selectedItem, setPage]);

  const isLoadingDisplay =
    stopPlacesLoading && !(activeSearchContext === 'data' && searchQuery.trim());

  const isErrorDisplay = stopPlacesError && !(activeSearchContext === 'data' && searchQuery.trim());

  if (isLoadingDisplay && dataForTable.length === 0) return <LoadingPage />;
  if (isErrorDisplay && dataForTable.length === 0) return <ErrorPage />;

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
        onClick={toggleSidebar}
      />
      <Box
        ref={tableContentContainerRef}
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
        <DataPageContent
          data={dataForTable}
          loading={isLoadingDisplay}
          error={isErrorDisplay ? stopPlacesError : null}
          totalCount={currentTotalForTable}
          order={order}
          orderBy={orderBy}
          handleRequestSort={handleRequestSort}
          page={page}
          rowsPerPage={rowsPerPage}
          setPage={setPage}
          setRowsPerPage={setRowsPerPage}
        />
      </Box>
    </Box>
  );
}
