import { productViewConfig } from '../data/products/productViewConfig.tsx';
import GenericDataViewPage from './GenericDataViewPage.tsx';
import type { Product, ProductSortKey } from '../data/products/productTypes.ts';

export default function ProductView() {
  return <GenericDataViewPage<Product, ProductSortKey> viewConfig={productViewConfig} />;
}
