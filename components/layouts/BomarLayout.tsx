import ProductCard from "@/components/ProductCardBomar";
import type { BomarData } from "@/lib/types";

interface Props {
    data: BomarData;
    title?: string;
}

export default function BomarLayout({ data, title }: Props) {
    return (
        <div className="anim-opacity flex flex-col items-center justify-center space-y-6 pb-12 px-4">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">
                {title || data.title || "Cennik"}
            </h1>

            {Object.entries(data.categories || {}).map(
                ([categoryName, products]) => (
                    <div
                        key={categoryName}
                        id={categoryName}
                        className="w-full max-w-7xl scroll-mt-8"
                    >
                        <p className="text-start w-full text-2xl font-semibold mb-6 capitalize">
                            {categoryName}:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(products).map(
                                ([productName, productData], idx) => (
                                    <ProductCard
                                        key={productName + idx}
                                        name={productName}
                                        data={productData}
                                        category={categoryName}
                                        overrides={{}}
                                    />
                                )
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
