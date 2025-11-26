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

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const cennikData: CennikData = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
    );

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

    if (!found) {
        notFound();
    }

    const { productName, productData } = found;

    return (
        <>
            <Link
                href="/p/mp-nidzica"
                className="text-sm font-semibold hover:bg-amber-50 hover:text-amber-800 hover:border-gray-300  transition-colors bg-white py-2 px-4 rounded-lg mr-4 border border-gray-200"
            >
                ← Powrót
            </Link>
            <div className="max-w-4xl mx-auto py-12 px-4">
                <div className="flex items-center mb-6">
                    <h1 className="text-3xl font-bold">{productName}</h1>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            {productData.image ? (
                                <div className="relative h-80 bg-gray-100 rounded overflow-hidden">
                                    <Image
                                        src={productData.image}
                                        alt={productName}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
                                    Brak zdjęcia
                                </div>
                            )}
                        </div>

                        <div>
                            {productData.description &&
                                productData.description.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-semibold mb-2">
                                            Opis
                                        </h3>
                                        <ul className="list-disc list-inside text-sm text-gray-700">
                                            {productData.description.map(
                                                (d, i) => (
                                                    <li key={i}>{d}</li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Elements table if object */}
                    {productData.elements &&
                        typeof productData.elements === "object" &&
                        !Array.isArray(productData.elements) && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">Elementy</h3>
                                <div className="overflow-x-auto border rounded">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="p-2 text-left">
                                                    Element
                                                </th>
                                                <th className="p-2 text-right">
                                                    Ilość
                                                </th>
                                                {Object.keys(
                                                    Object.values(
                                                        productData.elements
                                                    )[0]?.prices || {}
                                                ).map((g) => (
                                                    <th
                                                        key={g}
                                                        className="p-2 text-right"
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
                                                    <td className="p-2">
                                                        {elName}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        {elData.quantity}
                                                    </td>
                                                    {Object.keys(
                                                        elData.prices || {}
                                                    ).map((g) => (
                                                        <td
                                                            key={g}
                                                            className="p-2 text-right"
                                                        >
                                                            {elData.prices[g]}{" "}
                                                            zł
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
                                            <div className="text-sm text-gray-600">
                                                x{el.quantity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    {/* Prices summary */}
                    {productData.prices && (
                        <div>
                            <h3 className="font-semibold mb-2">Grupy cenowe</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            {Object.keys(
                                                productData.prices
                                            ).map((k) => (
                                                <th
                                                    key={k}
                                                    className="p-2 border"
                                                >
                                                    {k}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {Object.values(
                                                productData.prices
                                            ).map((p: any, i) => (
                                                <td
                                                    key={i}
                                                    className="p-2 border text-center font-semibold text-blue-600"
                                                >
                                                    {p} zł
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {productData.technicalImage ? (
                        <div className="relative h-96 rounded overflow-hidden">
                            <Image
                                src={productData.technicalImage}
                                alt={`${productName} technical`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ) : (
                        <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
                            Brak zdjęcia technicznego
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
