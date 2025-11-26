import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type ProductData = {
    image?: string;
    technicalImage?: string;
    description?: string[];
    elements?: Record<string, any> | any[];
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
    const filePath = path.join(process.cwd(), "data", `Mp-Nidzica.json`);

    if (!fs.existsSync(filePath)) return notFound();

    const cennikData: CennikData = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
    );

    // Find product case-insensitively across categories
    let found: {
        category: string;
        productName: string;
        productData: ProductData;
    } | null = null;
    for (const [cat, products] of Object.entries(cennikData.categories || {})) {
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

    const formatPrice = (v: any) =>
        typeof v === "number" ? `${v.toLocaleString("pl-PL")} zł` : v || "-";

    return (
        <div className="max-w-6xl mx-auto py-12 px-4">
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
                                        width={500}
                                        height={500}
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
                        <h1 className="text-4xl font-bold text-end">{productName}</h1>
                        {productData.description &&
                            productData.description.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Opis</h3>
                                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                        {productData.description.map((d, i) => (
                                            <li key={i}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        {productData.prices && (
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    Grupy cenowe
                                </h4>
                                <div className="space-y-2">
                                    {Object.entries(productData.prices).map(
                                        ([k, v]) => (
                                            <div
                                                key={k}
                                                className="flex justify-between items-center"
                                            >
                                                <div className="text-sm text-gray-600">
                                                    {k}
                                                </div>
                                                <div className="text-lg font-semibold text-blue-600">
                                                    {formatPrice(v)}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Elements table if object */}
                {productData.elements &&
                    typeof productData.elements === "object" &&
                    !Array.isArray(productData.elements) && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">
                                Elementy i ceny
                            </h3>
                            <div className="overflow-x-auto border rounded">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left">
                                                Element
                                            </th>
                                            {Object.keys(
                                                Object.values(
                                                    productData.elements
                                                )[0]?.prices || {}
                                            ).map((g) => (
                                                <th
                                                    key={g}
                                                    className="p-3 text-right"
                                                >
                                                    {g}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(
                                            productData.elements
                                        ).map(([elName, elData]) => (
                                            <tr
                                                key={elName}
                                                className="border-t hover:bg-gray-50"
                                            >
                                                <td className="p-3 font-medium">
                                                    {elName}
                                                </td>
                                                {Object.keys(
                                                    elData.prices || {}
                                                ).map((g) => (
                                                    <td
                                                        key={g}
                                                        className="p-3 text-right"
                                                    >
                                                        {formatPrice(
                                                            elData.prices[g]
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                {/* If elements is array show simple list */}
                {Array.isArray(productData.elements) &&
                    productData.elements.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">Elementy</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {productData.elements.map((el, i) => (
                                    <div
                                        key={i}
                                        className="bg-gray-50 border rounded p-3 text-center"
                                    >
                                        <div className="font-semibold">
                                            {el.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                {/* Large technical image at bottom */}
                {productData.technicalImage ? (
                    <div className="relative h-96 rounded overflow-hidden mt-4">
                        <Image
                            src={productData.technicalImage}
                            alt={`${productName} technical`}
                            fill
                            className="object-contain"
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
