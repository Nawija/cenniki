import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
        <div className="flex flex-col items-center justify-center space-y-6 pb-12 px-4 anim-opacity">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(products).map(
                                ([productName, productData], idx) => (
                                    <Link
                                        key={productName + idx}
                                        href={`/p/mp-nidzica/${encodeURIComponent(
                                            String(productName).toLowerCase()
                                        )}`}
                                    >
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition p-4">
                                            <div className="grid grid-cols-1 gap-2 mb-3">
                                                <h3 className="text-center text-xl font-semibold">
                                                    {productName}
                                                </h3>
                                                <div className="h-40">
                                                    {productData.image ? (
                                                        <Image
                                                            src={
                                                                productData.image
                                                            }
                                                            height={400}
                                                            width={400}
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
                                                <div className="h-52">
                                                    {productData.technicalImage ? (
                                                        <Image
                                                            src={
                                                                productData.technicalImage
                                                            }
                                                            alt={`${String(
                                                                productName
                                                            )} technical`}
                                                            height={400}
                                                            width={400}
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
