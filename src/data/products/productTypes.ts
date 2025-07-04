export interface Product {
  id: string;
  version: number;
  name: string;
  price: number;
  stock: number;
  category: 'Electronics' | 'Books' | 'Clothing';
}

export type ProductSortKey = 'name' | 'price' | 'stock';
