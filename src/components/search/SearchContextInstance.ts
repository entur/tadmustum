import { createContext } from 'react';
import type { SearchContextProps } from './searchTypes.ts';

// Create the context
export const SearchContext = createContext<SearchContextProps | undefined>(undefined);
