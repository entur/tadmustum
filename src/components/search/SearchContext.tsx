import React, { useState, useCallback, useRef, type ReactNode, useEffect } from 'react';
import { SearchContext } from './SearchContextInstance.ts';
import type { SearchContextViewType, SearchResultItem, SearchFunction } from './searchTypes.ts';

function debounce<F extends (...args: string[]) => void>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
}

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearchContext, setActiveSearchContext] = useState<SearchContextViewType>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [suggestionResults, setSuggestionResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);

  const searchFunctionsRef = useRef<
    Partial<Record<NonNullable<SearchContextViewType>, SearchFunction>>
  >({});

  const registerSearchFunction = useCallback(
    (contextType: SearchContextViewType, func: SearchFunction | null) => {
      if (contextType) {
        if (func) {
          searchFunctionsRef.current[contextType] = func;
        } else {
          delete searchFunctionsRef.current[contextType];
        }
      }
    },
    []
  );

  const executeSearch = useCallback(
    async (query: string): Promise<SearchResultItem[]> => {
      if (!query.trim() || !activeSearchContext) return [];
      const searchFunc = searchFunctionsRef.current[activeSearchContext];
      if (!searchFunc) {
        console.warn(`No search function registered for active context: ${activeSearchContext}`);
        return [];
      }
      setIsLoading(true);
      try {
        return await searchFunc(query);
      } catch (error) {
        console.error(`Search failed for context ${activeSearchContext}:`, error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [activeSearchContext]
  );

  const performLiveSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestionResults([]);
        setSearchResults([]);
        return;
      }
      const results = await executeSearch(query);
      setSuggestionResults(results);
      setSearchResults(results);
    }, 300),
    [executeSearch]
  );

  const performSuggestionOnlySearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestionResults([]);
        return;
      }
      const results = await executeSearch(query);
      setSuggestionResults(results);
    }, 300),
    [executeSearch]
  );

  const performSearch = useCallback(async () => {
    setSuggestionResults([]);
    const results = await executeSearch(searchQuery);
    setSearchResults(results);
  }, [searchQuery, executeSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSuggestionResults([]);
    setSelectedItem(null);
  }, []);

  const handleSetSearchQuery = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setSelectedItem(null);

      if (activeSearchContext === 'data') {
        performLiveSearch(query);
      } else {
        performSuggestionOnlySearch(query);
        if (!query.trim()) {
          setSearchResults([]);
        }
      }
    },
    [activeSearchContext, performLiveSearch, performSuggestionOnlySearch]
  );

  useEffect(() => {
    clearSearch();
  }, [activeSearchContext, clearSearch]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery: handleSetSearchQuery,
        activeSearchContext,
        setActiveSearchContext,
        searchResults,
        suggestionResults,
        isLoading,
        performSearch,
        clearSearch,
        selectedItem,
        setSelectedItem,
        registerSearchFunction,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};
