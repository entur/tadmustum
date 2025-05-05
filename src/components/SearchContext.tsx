import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type SearchBoxComponent = ReactNode;

interface SearchContextProps {
  searchBox: SearchBoxComponent;
  setSearchBox: (component: SearchBoxComponent) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

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
      <SearchContext.Provider value={{ searchBox, setSearchBox }}>
        {children}
      </SearchContext.Provider>
  );
};
