interface PriceCellProps {
  price: number;
}

export default function PriceCell({ price }: PriceCellProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);

  return <span>{formattedPrice}</span>;
}
