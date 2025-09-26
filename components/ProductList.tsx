// components/ProductList.tsx
import Link from "next/link";

type Product = {
    productId: string;
    name: string;
};

type Props = {
    products: Product[];
};

export default function ProductList({ products }: Props) {
    return (
        <div>
            <h3>Produkty</h3>
            <ul>
                {products.map((prod) => (
                    <li key={prod.productId}>
                        <Link href={`/product/${prod.productId}`}>
                            {prod.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
