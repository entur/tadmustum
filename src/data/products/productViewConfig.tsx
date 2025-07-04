import { useDataViewTableLogic } from '../../hooks/useDataViewTableLogic';
import DataPageContent from '../../components/data/DataPageContent';
import type { ColumnDefinition } from '../../components/data/dataTableTypes.ts';
import { useProducts } from './useProducts.ts';
import { useProductSearch } from './useProductSearch.ts';
import type { Product, ProductSortKey } from './productTypes.ts';
import PriceCell from './cells/PriceCell.tsx';
import EditActionCell from './cells/EditActionCell.tsx';
import type { FilterDefinition } from '../../components/search/searchTypes.ts';

/**
 * Defines the columns for the Product data table.
 */
const productColumns: ColumnDefinition<Product, ProductSortKey>[] = [
  {
    id: 'name',
    headerLabel: 'Product Name',
    isSortable: true,
    renderCell: item => item.name,
    display: 'always',
  },
  {
    id: 'price',
    headerLabel: 'Price',
    isSortable: true,
    renderCell: item => <PriceCell price={item.price} />,
    display: 'desktop-only',
  },
  {
    id: 'stock',
    headerLabel: 'In Stock',
    isSortable: true,
    renderCell: item => item.stock,
    display: 'desktop-only',
  },
  {
    id: 'category',
    headerLabel: 'Category',
    isSortable: false,
    renderCell: item => item.category,
    display: 'always',
  },
  {
    id: 'actions',
    headerLabel: 'Actions',
    align: 'center',
    renderCell: item => <EditActionCell item={item} />,
    display: 'always',
  },
];

/**
 * A function to extract the key used for filtering Products by category.
 */
const getProductFilterKey = (item: Product): string => {
  return item.category;
};

/**
 * A function to get the specific value from a Product for sorting.
 */
const getProductSortValue = (item: Product, key: ProductSortKey): string | number => {
  return item[key];
};

const productFilters: FilterDefinition[] = [
  {
    id: 'Electronics',
    labelKey: 'product.electronics',
    defaultLabel: 'Electronics',
  },
  {
    id: 'Books',
    labelKey: 'product.books',
    defaultLabel: 'Books',
  },
  {
    id: 'Clothing',
    labelKey: 'product.clothing',
    defaultLabel: 'Clothing',
  },
];

/**
 * The complete configuration object for the Product data view.
 */
export const productViewConfig = {
  useData: useProducts,
  useSearchRegistration: useProductSearch,
  useTableLogic: useDataViewTableLogic,
  PageContentComponent: DataPageContent,
  columns: productColumns,
  getFilterKey: getProductFilterKey,
  getSortValue: getProductSortValue,
  filters: productFilters,
};
