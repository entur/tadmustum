import { useMemo } from 'react';
import type { StopPlace } from '../data/StopPlaceContext';
import type {
  SearchResultItem,
  SearchContextViewType,
  StopPlaceTypeFilter,
} from '../components/search/searchTypes';
import type { Order } from '../data/useStopPlaces';

interface UseDataViewTableLogicParams {
  allFetchedStopPlaces: StopPlace[] | null;
  originalTotalCount: number;
  searchResults: SearchResultItem[];
  searchQuery: string;
  selectedItem: SearchResultItem | null;
  activeSearchContext: SearchContextViewType;
  order: Order;
  orderBy: keyof StopPlace | 'name';
  page: number;
  rowsPerPage: number;
  activeFilters: StopPlaceTypeFilter[];
}

export function useDataViewTableLogic({
  allFetchedStopPlaces,
  originalTotalCount,
  searchResults,
  searchQuery,
  selectedItem,
  activeSearchContext,
  order,
  orderBy,
  page,
  rowsPerPage,
  activeFilters,
}: UseDataViewTableLogicParams) {
  return useMemo(() => {
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
      baseData = allFetchedStopPlaces || [];
      if (isDataSearchActive && activeFilters.length > 0) {
        baseData = baseData.filter(sp => {
          const typeKey =
            sp.__typename === 'ParentStopPlace' ? 'parentStopPlace' : sp.stopPlaceType;
          return activeFilters.includes(typeKey);
        });
      }

      currentTotal =
        isDataSearchActive && activeFilters.length > 0 ? baseData.length : originalTotalCount;
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
    activeFilters,
  ]);
}
