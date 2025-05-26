import React, { useState } from 'react';
import type { ReactNode } from 'react';
import type { SearchBoxComponent } from './searchTypes';
import { SearchContext } from './SearchContextInstance';

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
