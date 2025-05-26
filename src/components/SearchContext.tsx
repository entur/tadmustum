import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearch } from './searchUtils';

type SearchBoxComponent = ReactNode;

interface SearchContextProps {
  searchBox: SearchBoxComponent;
  setSearchBox: (component: SearchBoxComponent) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

interface SearchProviderProps {
  children: ReactNode;
  initialSearchBox?: SearchBoxComponent;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({
  children,
  initialSearchBox = null,
}) => {
  const [searchBox, setSearchBox] = useState<SearchBoxComponent>(initialSearchBox);

  return (
    <SearchContext.Provider value={{ searchBox, setSearchBox }}>{children}</SearchContext.Provider>
  );
};

// Re-export the hook
export { useSearch };
