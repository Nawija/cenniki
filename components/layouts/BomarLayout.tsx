"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCardBomar";
import PageHeader from "@/components/PageHeader";
import PriceSimulator from "@/components/PriceSimulator";
import { useScrollToHash, useScheduledChanges } from "@/hooks";
import type { BomarData, BomarProductData } from "@/lib/types";
import Image from "next/image";

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
    priceFactor?: number; // globalny fallback
    producerSlug?: string; // opcjonalnie przekazany slug
}

export default function BomarLayout({
    data,
    title,
    priceFactor = 1,
    producerSlug: propSlug,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);

    // Użyj przekazanego sluga lub wyciągnij z pathname (/p/bomar -> bomar)
    const producerSlug = useMemo(() => {
        if (propSlug) return propSlug;
        const match = pathname.match(/\/p\/([^/]+)/);
        return match ? match[1] : "";
    }, [propSlug, pathname]);

    // Pobierz zaplanowane zmiany cen
    const { getProductChanges, hasScheduledChanges, getAverageChange } =
        useScheduledChanges(producerSlug);

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearch(urlSearch);
        }
    }, [searchParams]);

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
            {pathname.includes("bomar") && (
                <div
                    className={`max-w-7xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden mt-8 transition-all duration-300 ${
                        search.trim()
                            ? "opacity-0 max-h-0 !mt-0 !p-0 !border-0"
                            : "opacity-100 "
                    }`}
                >
                    <div className="p-6 space-y-8">
                        <div className="pt-6">
                            <p className="text-gray-700 text-center text-base">
                                Umożliwiamy zmianę nóg na inne niż widoczne na
                                zdjęciach:
                            </p>
                            <p className="text-gray-800 font-semibold text-center mt-2">
                                rodzaje stelaży nóg (trzy typy):
                            </p>
                        </div>

                        {/* Rodzaje nóg - Zdjęcia */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200  ">
                                <span className="text-sm font-medium text-gray-700 mb-2">
                                    1. standardowa
                                </span>
                                <div className="h-32 w-full relative flex items-center justify-center">
                                    <Image
                                        src="/images/bomar/dodatkoweOpcje/1.png"
                                        alt="Noga Standardowa"
                                        fill
                                        style={{ objectFit: "contain" }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200  ">
                                <span className="text-sm font-medium text-gray-700 mb-2">
                                    2. skośna (mechanizm obrotowy 3-stopniowy)
                                </span>
                                <div className="h-32 w-full relative flex items-center justify-center">
                                    <Image
                                        src="/images/bomar/dodatkoweOpcje/2.png"
                                        alt="Noga Skośna"
                                        fill
                                        style={{ objectFit: "contain" }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200  ">
                                <span className="text-sm font-medium text-gray-700 mb-2">
                                    3. meduza
                                </span>
                                <div className="h-32 w-full relative flex items-center justify-center">
                                    <Image
                                        src="/images/bomar/dodatkoweOpcje/3.png"
                                        alt="Noga Meduza"
                                        fill
                                        style={{ objectFit: "contain" }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-yellow-50/80 rounded-xl border-yellow-200 border">
                            <div className="w-24 h-24 flex-shrink-0 relative bg-gray-200 rounded-lg overflow-hidden">
                                <Image
                                    src="/images/bomar/dodatkoweOpcje/4.png"
                                    alt="Siedzisko sprężynowe"
                                    fill
                                    style={{ objectFit: "cover" }}
                                />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">
                                    *system sprężyn kieszeniowych (siedzisko -
                                    jeden rodzaj, szycie na półokrągło, grubość
                                    ok 11 cm)
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    (niezależnie od modelu krzesła) przez
                                    zwiększoną grubość siedziska, obniżony
                                    stelaż nóg{" "}
                                    <span className="font-medium text-red-600">
                                        wysokość 42 cm
                                    </span>
                                    .
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {Object.keys(filteredCategories).length > 0 ? (
                Object.entries(filteredCategories).map(
                    ([categoryName, products]) => {
                        const categorySurcharges =
                            data.categorySettings?.[categoryName]?.surcharges ||
                            [];
                        // Użyj mnożnika kategorii jeśli istnieje, w przeciwnym razie globalny priceFactor
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
                                                    producerName={
                                                        title || "Bomar"
                                                    }
                                                    scheduledChanges={getProductChanges(
                                                        productName,
                                                        categoryName
                                                    )}
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
        </div>
    );
}
