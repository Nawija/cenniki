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

    const elementGroups =
        productData.elements &&
        typeof productData.elements === "object" &&
        !Array.isArray(productData.elements)
            ? Object.keys(Object.values(productData.elements)[0]?.prices || {})
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
                            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-zinc-100 border-b border-zinc-200">
                                                <th className="px-4 py-3 text-left font-semibold text-sm text-gray-900 min-w-[200px]">
                                                    Element
                                                </th>
                                                {elementGroups.map((g) => (
                                                    <th
                                                        key={g}
                                                        className="px-3 py-3 text-center font-semibold text-sm text-gray-900 whitespace-nowrap"
                                                    >
                                                        {g}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {Object.entries(
                                                productData.elements
                                            ).map(([elName, elData], idx) => (
                                                <tr
                                                    key={elName}
                                                    className={`border-b border-zinc-200 transition-colors hover:bg-blue-50 ${
                                                        idx % 2 === 0
                                                            ? "bg-white"
                                                            : "bg-gray-50"
                                                    }`}
                                                >
                                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                                        {elName}
                                                    </td>

                                                    {elementGroups.map((g) => {
                                                        const price =
                                                            elData.prices?.[g];
                                                        return (
                                                            <td
                                                                key={g}
                                                                className="px-3 py-3 text-center text-sm font-medium text-gray-800"
                                                            >
                                                                {price ? (
                                                                    <span className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 text-gray-900 rounded-lg font-semibold">
                                                                        {formatPrice(
                                                                            price
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
