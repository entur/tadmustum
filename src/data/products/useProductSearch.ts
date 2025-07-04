import { useCallback, useEffect } from 'react';
import { useSearch } from '../../components/search';
import type { SearchResultItem } from '../../components/search/searchTypes';
import type { Product } from './productTypes.ts';

export function useProductSearch(allProducts: Product[] | null, productsLoading: boolean) {
  const { setActiveSearchContext, registerSearchFunction } = useSearch();

  const searchProductData = useCallback(
    async (query: string, filters: string[]): Promise<SearchResultItem[]> => {
      if (productsLoading || !allProducts) return [];
      const lowerQuery = query.toLowerCase();

      return allProducts
        .filter(p => {
          const textMatch = p.name.toLowerCase().includes(lowerQuery);
          const categoryMatch = filters.length === 0 || filters.includes(p.category);
          return textMatch && categoryMatch;
        })
        .map(p => ({
          id: p.id,
          name: p.name,
          type: 'data' as const,
          originalData: p,
        }));
    },
    [productsLoading, allProducts]
  );

  useEffect(() => {
    setActiveSearchContext('data');
    registerSearchFunction('data', searchProductData);
    return () => {
      registerSearchFunction('data', null);
    };
  }, [setActiveSearchContext, registerSearchFunction, searchProductData]);
}
