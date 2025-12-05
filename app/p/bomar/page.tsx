import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCardBomar";

type ProductSize = {
    dimension: string;
    prices: string | number;
};

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

export default async function BomarPage() {
    const filePath = path.join(process.cwd(), "data", `Bomar.json`);

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const cennikData: CennikData = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
    );

    return (
        <div className="anim-opacity flex flex-col items-center justify-center space-y-6 pb-12 px-4">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">
                {cennikData.title || "Cennik Bomar"}
            </h1>

            {Object.entries(cennikData.categories || {}).map(
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
