import { useState, useMemo } from 'react';
import type { ProductSortKey } from './productTypes.ts';
import type { Order } from '../stop-places/useStopPlaces.ts';
import { MOCK_PRODUCTS } from './data/mockProducts.ts';

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map(el => el[0]);
}

function getComparator<Key extends string>(
  order: Order,
  orderBy: Key
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => (b[orderBy] < a[orderBy] ? -1 : 1)
    : (a, b) => (a[orderBy] < b[orderBy] ? -1 : 1);
}

export function useProducts() {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<ProductSortKey>('name');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleRequestSort = (property: ProductSortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedData = useMemo(
    () => stableSort(MOCK_PRODUCTS, getComparator(order, orderBy)),
    [order, orderBy]
  );

  return {
    allData: sortedData,
    totalCount: MOCK_PRODUCTS.length,
    loading: false,
    error: null,
    order,
    orderBy,
    handleRequestSort,
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
  };
}
