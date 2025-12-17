import fs from "fs";
import path from "path";
import { getAllProducers } from "@/lib/producers";
import type { ProducerConfig, UniversalProduct } from "@/lib/types";

// Statyczna strona - odświeża się przy nowym buildzie
export const dynamic = "force-static";

interface ProducerFactorData {
    producer: ProducerConfig;
    mainFactor: number;
    categoryFactors: Record<string, number>;
    productsWithHigherFactor: {
        name: string;
        category?: string;
        priceFactor: number;
    }[];
}

function loadProducerData(dataFile: string): any {
    const filePath = path.join(process.cwd(), "data", dataFile);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    return null;
}

function extractFactorData(
    producer: ProducerConfig,
    data: any
): ProducerFactorData {
    const mainFactor = producer.priceFactor ?? 1;
    const categoryFactors: Record<string, number> = {};
    const productsWithHigherFactor: ProducerFactorData["productsWithHigherFactor"] =
        [];

    // Extract category price factors if they exist
    if (data?.categoryPriceFactors) {
        Object.entries(data.categoryPriceFactors).forEach(
            ([category, factor]) => {
                if (typeof factor === "number" && factor !== mainFactor) {
                    categoryFactors[category] = factor;
                }
            }
        );
    }

    // Check for category-based data (like Bomar)
    if (data?.categories) {
        Object.entries(data.categories).forEach(
            ([categoryName, categoryProducts]) => {
                if (
                    typeof categoryProducts === "object" &&
                    categoryProducts !== null
                ) {
                    Object.entries(
                        categoryProducts as Record<string, UniversalProduct>
                    ).forEach(([productName, product]) => {
                        if (
                            product.priceFactor &&
                            typeof product.priceFactor === "number" &&
                            product.priceFactor > mainFactor
                        ) {
                            productsWithHigherFactor.push({
                                name: product.name || productName,
                                category: categoryName,
                                priceFactor: product.priceFactor,
                            });
                        }
                    });
                }
            }
        );
    }

    // Check for list-based data (like mp-nidzica, benix, etc.)
    if (data?.products && Array.isArray(data.products)) {
        data.products.forEach((product: UniversalProduct) => {
            if (
                product.priceFactor &&
                typeof product.priceFactor === "number" &&
                product.priceFactor > mainFactor
            ) {
                productsWithHigherFactor.push({
                    name: product.name || product.MODEL || "Nieznany produkt",
                    category: product.category,
                    priceFactor: product.priceFactor,
                });
            }
        });
    }

    // Check for table-based data (Arkusz1)
    if (data?.Arkusz1 && Array.isArray(data.Arkusz1)) {
        data.Arkusz1.forEach((product: UniversalProduct) => {
            if (
                product.priceFactor &&
                typeof product.priceFactor === "number" &&
                product.priceFactor > mainFactor
            ) {
                productsWithHigherFactor.push({
                    name: product.name || product.MODEL || "Nieznany produkt",
                    category: product.category,
                    priceFactor: product.priceFactor,
                });
            }
        });
    }

    // Sort products by factor descending
    productsWithHigherFactor.sort((a, b) => b.priceFactor - a.priceFactor);

    return {
        producer,
        mainFactor,
        categoryFactors,
        productsWithHigherFactor,
    };
}

export default async function FaktoryPage() {
    const producers = getAllProducers();

    // Load all producer data and extract factors
    const allFactorData: ProducerFactorData[] = producers
        .map((producer) => {
            const data = loadProducerData(producer.dataFile);
            return extractFactorData(producer, data);
        })
        .sort((a, b) =>
            a.producer.displayName.localeCompare(b.producer.displayName, "pl")
        );

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 my-8 lg:my-12">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    Faktory cenowe
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Ceny produktów mnożone są przez podane faktory
                </p>
            </header>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Producent / Element
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-28">
                                Faktor
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">
                                Różnica
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {allFactorData.map((data) => (
                            <>
                                {/* Producer row */}
                                <tr
                                    key={data.producer.slug}
                                    className="bg-white border-b border-gray-200"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        data.producer.color ||
                                                        "#9ca3af",
                                                }}
                                            />
                                            <span className="text-base font-semibold text-gray-900">
                                                {data.producer.displayName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-base font-bold text-gray-900">
                                            ×{data.mainFactor.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-400">
                                        —
                                    </td>
                                </tr>

                                {/* Category rows */}
                                {Object.entries(data.categoryFactors).map(
                                    ([category, factor]) => {
                                        const diffPercent =
                                            ((factor - data.mainFactor) /
                                                data.mainFactor) *
                                            100;
                                        return (
                                            <tr
                                                key={`${data.producer.slug}-cat-${category}`}
                                                className="border-b border-gray-100 bg-amber-50/50 hover:bg-amber-50"
                                            >
                                                <td className="px-4 py-2.5 pl-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-400">
                                                            ↳
                                                        </span>
                                                        <span className="text-base text-gray-700 capitalize">
                                                            kategoria:{" "}
                                                            {category}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className="text-base font-semibold text-amber-700">
                                                        ×{factor.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            diffPercent > 0
                                                                ? "text-red-500"
                                                                : "text-green-600"
                                                        }`}
                                                    >
                                                        {diffPercent > 0
                                                            ? "+"
                                                            : ""}
                                                        {diffPercent.toFixed(0)}
                                                        %
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}

                                {/* Product rows */}
                                {data.productsWithHigherFactor.map(
                                    (product, idx) => {
                                        const diffPercent =
                                            ((product.priceFactor -
                                                data.mainFactor) /
                                                data.mainFactor) *
                                            100;
                                        return (
                                            <tr
                                                key={`${data.producer.slug}-prod-${product.name}-${idx}`}
                                                className="border-b border-gray-100 bg-red-50/50 hover:bg-red-50"
                                            >
                                                <td className="px-4 py-2.5 pl-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-red-300">
                                                            ↳
                                                        </span>
                                                        <span className="text-base text-gray-700">
                                                            {product.name}
                                                        </span>
                                                        {product.category && (
                                                            <span className="text-sm text-gray-400">
                                                                (
                                                                {
                                                                    product.category
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className="text-base font-semibold text-red-600">
                                                        ×
                                                        {product.priceFactor.toFixed(
                                                            2
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className="text-sm font-medium text-red-500">
                                                        +
                                                        {diffPercent.toFixed(0)}
                                                        %
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-1">Jak to działa?</p>
                <p>
                    Cena produktu = cena bazowa × faktor. Na przykład: produkt
                    za 1000 zł z faktorem ×2.50 kosztuje{" "}
                    <strong>2500 zł</strong>.
                </p>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                    <span>Producent (faktor główny)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
                    <span>Dla kategorii</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                    <span>Dla produktu</span>
                </div>
            </div>
        </div>
    );
}
