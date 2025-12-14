"use client";

import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCardBomar";
import PageHeader from "@/components/PageHeader";
import ReportButton from "@/components/ReportButton";
import PriceSimulator from "@/components/PriceSimulator";
import { useScrollToHash } from "@/hooks";
import type { BomarData, BomarProductData } from "@/lib/types";

interface Surcharge {
    label: string;
    percent: number;
}

interface CategorySettings {
    surcharges?: Surcharge[];
}

interface Props {
    data: BomarData & {
        categorySettings?: Record<string, CategorySettings>;
        categoryPriceFactors?: Record<string, number>;
    };
    title?: string;
    priceFactor?: number;
}

export default function HalexLayout({ data, title, priceFactor = 1 }: Props) {
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);

    // Scroll do elementu z hash po załadowaniu
    useScrollToHash();

    // Filtruj kategorie i produkty po nazwie
    const filteredCategories = useMemo(() => {
        if (!search.trim()) return data.categories || {};

        const query = search.toLowerCase();
        const result: Record<string, Record<string, BomarProductData>> = {};

        Object.entries(data.categories || {}).forEach(([catName, products]) => {
            const filtered = Object.entries(products).filter(
                ([name, productData]) =>
                    name.toLowerCase().includes(query) ||
                    (productData.previousName &&
                        productData.previousName.toLowerCase().includes(query))
            );
            if (filtered.length > 0) {
                result[catName] = Object.fromEntries(filtered);
            }
        });

        return result;
    }, [data.categories, search]);

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity space-y-12">
            <PageHeader
                title={title || data.title}
                search={search}
                onSearchChange={setSearch}
            />

            <PriceSimulator
                currentFactor={simulationFactor}
                onFactorChange={setSimulationFactor}
            />

            {Object.keys(filteredCategories).length > 0 ? (
                Object.entries(filteredCategories).map(
                    ([categoryName, products]) => {
                        const categorySurcharges =
                            data.categorySettings?.[categoryName]?.surcharges ||
                            [];
                        const baseFactor =
                            data.categoryPriceFactors?.[categoryName] ??
                            priceFactor;
                        // Jeśli symulacja aktywna, użyj jej zamiast bazowego faktora
                        const categoryFactor =
                            simulationFactor !== 1
                                ? simulationFactor
                                : baseFactor;

                        return (
                            <div
                                key={categoryName}
                                id={categoryName}
                                className="w-full max-w-7xl mx-auto scroll-mt-8"
                            >
                                <p className="text-start w-full text-2xl font-semibold mb-6 capitalize">
                                    {categoryName}:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(products)
                                        .sort(([a], [b]) =>
                                            a.localeCompare(b, "pl")
                                        )
                                        .map(
                                            (
                                                [productName, productData],
                                                idx
                                            ) => (
                                                <ProductCard
                                                    key={productName + idx}
                                                    name={productName}
                                                    data={productData}
                                                    category={categoryName}
                                                    overrides={{}}
                                                    priceFactor={categoryFactor}
                                                    surcharges={
                                                        categorySurcharges
                                                    }
                                                />
                                            )
                                        )}
                                </div>
                            </div>
                        );
                    }
                )
            ) : (
                <p className="text-center text-gray-500 text-lg mt-10">
                    Brak produktów pasujących do wyszukiwania.
                </p>
            )}

            <ReportButton producerName={title || "Halex"} />
        </div>
    );
}
