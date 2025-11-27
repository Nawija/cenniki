import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ElementSelector from "@/components/ElementSelector";

type ProductData = {
    image?: string;
    technicalImage?: string;
    description?: string[];
    elements?: Record<string, any>;
    prices?: Record<string, number>;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

export default function ProductDetailPage({
    params,
}: {
    params: { product: string };
}) {
    const { product } = params;

    const filePath = path.join(process.cwd(), "data", "Mp-Nidzica.json");

    if (!fs.existsSync(filePath)) return notFound();

    const cennikData: CennikData = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
    );

    // Find product (case-insensitive)
    let found: {
        category: string;
        productName: string;
        productData: ProductData;
    } | null = null;

    for (const [cat, products] of Object.entries(cennikData.categories)) {
        for (const [pName, pData] of Object.entries(products)) {
            if (pName.toLowerCase() === product.toLowerCase()) {
                found = {
                    category: cat,
                    productName: pName,
                    productData: pData,
                };
                break;
            }
        }
        if (found) break;
    }

    if (!found) return notFound();

    const { productName, productData } = found;

    const elementGroups =
        productData.elements &&
        typeof productData.elements === "object"
            ? Object.keys(
                  Object.values(productData.elements)[0]?.prices || {}
              )
            : [];

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 anim-opacity">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/p/mp-nidzica"
                    className="text-sm font-semibold hover:underline"
                >
                    ← Powrót
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <div className="rounded overflow-hidden mb-3">
                            {productData.image ? (
                                <Image
                                    src={productData.image}
                                    alt={productName}
                                    width={400}
                                    height={400}
                                    className="object-contain mx-auto"
                                />
                            ) : (
                                <div className="h-72 flex items-center justify-center text-gray-400">
                                    Brak zdjęcia
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h1 className="text-6xl font-bold text-orange-800 text-end p-12">
                            {productName}
                        </h1>

                        {productData.description && (
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {productData.description.map((d, i) => (
                                    <li key={i}>{d}</li>
                                ))}
                            </ul>
                        )}

                        {productData.prices && (
                            <div className="border rounded-lg p-4 bg-gray-50 mt-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    Grupy cenowe
                                </h4>

                                {Object.entries(productData.prices).map(
                                    ([k, v]) => (
                                        <div
                                            key={k}
                                            className="flex justify-between py-1"
                                        >
                                            <span>{k}</span>
                                            <span className="font-semibold text-blue-600">
                                                {v.toLocaleString("pl-PL")} zł
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ELEMENT SELECTOR — komponent klienta */}
                {productData.elements && (
                    <ElementSelector
                        elements={productData.elements}
                        groups={elementGroups}
                    />
                )}

                {productData.technicalImage && (
                    <div className="relative h-96 rounded overflow-hidden mt-12">
                        <Image
                            src={productData.technicalImage}
                            alt="technical"
                            fill
                            className="object-contain"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
