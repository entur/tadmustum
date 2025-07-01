export type SearchContextViewType = 'map' | 'data' | null;

export interface SearchResultItem {
  id: string;
  name: string;
  type: SearchContextViewType;
  coordinates?: [number, number];
  originalData?: unknown;
}

export type SearchFunction = (query: string) => Promise<SearchResultItem[]>;

export interface SearchContextProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  activeSearchContext: SearchContextViewType;
  setActiveSearchContext: (context: SearchContextViewType) => void;
  suggestionResults: SearchResultItem[];
  searchResults: SearchResultItem[];
  isLoading: boolean;
  performSearch: () => Promise<void>;
  clearSearch: () => void;
  selectedItem: SearchResultItem | null;
  setSelectedItem: (item: SearchResultItem | null) => void;

  registerSearchFunction: (contextType: SearchContextViewType, func: SearchFunction | null) => void;
}
