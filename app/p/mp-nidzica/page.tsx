import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";

type ProductSize = {
    dimension: string;
    prices: string | number;
};

type ProductData = {
    image?: string;
    technicalImage?: string;
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

export default async function MpNidzicaPage() {
    const filePath = path.join(process.cwd(), "data", `Mp-Nidzica.json`);

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const cennikData: CennikData = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
    );

    return (
        <div className="flex flex-col items-center justify-center space-y-6 pb-12 px-4">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">
                {cennikData.title || "MP Nidzica - Cennik"}
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
                                    <Link
                                        key={productName + idx}
                                        href={`/p/mp-nidzica/${encodeURIComponent(
                                            String(productName).toLowerCase()
                                        )}`}
                                        className="block"
                                    >
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition p-4">
                                            <div className="grid grid-cols-2 gap-2 h-40 mb-3">
                                                <div className="bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                                    {productData.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={
                                                                productData.image
                                                            }
                                                            alt={String(
                                                                productName
                                                            )}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="text-gray-400">
                                                            Brak zdjęcia
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                                    {productData.technicalImage ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={
                                                                productData.technicalImage
                                                            }
                                                            alt={`${String(
                                                                productName
                                                            )} technical`}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="text-gray-400">
                                                            Brak zdjęcia
                                                            technicznego
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <h3 className="text-center text-lg font-semibold">
                                                {productName}
                                            </h3>
                                        </div>
                                    </Link>
                                )
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
