import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";

type ProductElement = {
    name: string;
    quantity: number;
};

type ProductData = {
    image?: string;
    technicalImage?: string;
    description?: string[];
    elements?: ProductElement[];
    prices?: Record<string, number>;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

export default async function MpNidzicaPage() {
    const manufacturer = "mp-nidzica";

    // Nazwa pliku: Mp-nidzica → MpNidzica
    const manufacturerName = "MpNidzica";

    const filePath = path.join(
        process.cwd(),
        "data",
        `${manufacturerName}.json`
    );

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

                        <div className="space-y-8">
                            {Object.entries(products).map(
                                ([productName, productData]) => (
                                    <div
                                        key={productName}
                                        className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                                    >
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                                            <h2 className="text-2xl font-bold">
                                                {productName}
                                            </h2>
                                        </div>

                                        <div className="p-6">
                                            {/* Main Image & Technical Image */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                {productData.image && (
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                                            Wygląd produktu
                                                        </h3>
                                                        <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                                                            <img
                                                                src={
                                                                    productData.image
                                                                }
                                                                alt={
                                                                    productName
                                                                }
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {productData.technicalImage && (
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                                            Wymiary / Szczegóły
                                                        </h3>
                                                        <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                                                            <img
                                                                src={
                                                                    productData.technicalImage
                                                                }
                                                                alt="Technical"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {productData.description &&
                                                productData.description.length >
                                                    0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                                            Opis
                                                        </h3>
                                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                            {productData.description.map(
                                                                (
                                                                    desc: string,
                                                                    idx: number
                                                                ) => (
                                                                    <li
                                                                        key={
                                                                            idx
                                                                        }
                                                                    >
                                                                        {desc}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                            {/* Elements */}
                                            {productData.elements &&
                                                productData.elements.length >
                                                    0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                                            Elementy
                                                        </h3>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {productData.elements.map(
                                                                (
                                                                    elem: ProductElement,
                                                                    idx: number
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
                                                                    >
                                                                        <p className="text-sm font-medium text-gray-900">
                                                                            {
                                                                                elem.name
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-gray-600 mt-1">
                                                                            x
                                                                            {
                                                                                elem.quantity
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Prices */}
                                            {productData.prices && (
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                                        Grupy cenowe
                                                    </h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm border-collapse">
                                                            <thead>
                                                                <tr className="bg-gray-100">
                                                                    {Object.entries(
                                                                        productData.prices
                                                                    ).map(
                                                                        ([
                                                                            key,
                                                                        ]) => (
                                                                            <th
                                                                                key={
                                                                                    key
                                                                                }
                                                                                className="border border-gray-300 px-3 py-2 font-semibold text-gray-900"
                                                                            >
                                                                                <span className="hidden sm:inline">
                                                                                    Grupa{" "}
                                                                                    {key.match(
                                                                                        /\d+/
                                                                                    )?.[0] ||
                                                                                        ""}
                                                                                </span>
                                                                                <span className="sm:hidden">
                                                                                    G
                                                                                    {key.match(
                                                                                        /\d+/
                                                                                    )?.[0] ||
                                                                                        ""}
                                                                                </span>
                                                                            </th>
                                                                        )
                                                                    )}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    {Object.entries(
                                                                        productData.prices
                                                                    ).map(
                                                                        ([
                                                                            key,
                                                                            price,
                                                                        ]) => (
                                                                            <td
                                                                                key={
                                                                                    key
                                                                                }
                                                                                className="border border-gray-300 px-3 py-3 text-center font-semibold text-blue-600"
                                                                            >
                                                                                {price?.toLocaleString(
                                                                                    "pl-PL"
                                                                                )}{" "}
                                                                                zł
                                                                            </td>
                                                                        )
                                                                    )}
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
