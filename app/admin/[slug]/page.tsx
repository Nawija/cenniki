"use client";

import { useState, useEffect, use, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/components/ui";
import { useAdmin } from "../AdminContext";
import {
    isCategoryBasedData,
    isListBasedData,
    isTableBasedData,
} from "@/lib/types";
import type { ProducerConfig } from "@/lib/types";
import GoogleSpinner from "@/app/loading";

// Lazy loading edytorów uniwersalnych
const UniversalCategoryEditor = lazy(() =>
    import("@/components/admin").then((m) => ({
        default: m.UniversalCategoryEditor,
    }))
);
const UniversalListEditor = lazy(() =>
    import("@/components/admin").then((m) => ({
        default: m.UniversalListEditor,
    }))
);
const SmartPriceUpdater = lazy(() =>
    import("@/components/admin").then((m) => ({ default: m.SmartPriceUpdater }))
);

// Komponent loadera
function EditorLoader() {
    return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Ładowanie edytora...</span>
        </div>
    );
}

// Funkcja do łączenia nowych danych z istniejącymi obrazkami
function mergeDataWithImages(
    currentData: any,
    newData: any,
    layoutType: string
): any {
    if (!currentData || !newData) return newData || currentData;

    switch (layoutType) {
        case "bomar":
        case "topline":
        case "verikon":
        case "furnirest": {
            // Zachowaj obrazki i inne ustawienia z aktualnych danych
            const merged = { ...newData };
            if (!merged.categories) merged.categories = {};

            // Dla każdej kategorii zachowaj obrazki produktów
            const currentCategories = currentData.categories || {};
            for (const [catName, catProducts] of Object.entries(
                currentCategories
            )) {
                if (!merged.categories[catName]) continue;

                for (const [prodName, prodData] of Object.entries(
                    catProducts as Record<string, any>
                )) {
                    if (merged.categories[catName][prodName]) {
                        // Zachowaj obrazek jeśli istnieje
                        if (prodData.image) {
                            merged.categories[catName][prodName].image =
                                prodData.image;
                        }
                        // Zachowaj poprzednią nazwę
                        if (prodData.previousName) {
                            merged.categories[catName][prodName].previousName =
                                prodData.previousName;
                        }
                        // Zachowaj rabat
                        if (prodData.discount !== undefined) {
                            merged.categories[catName][prodName].discount =
                                prodData.discount;
                        }
                        if (prodData.discountLabel) {
                            merged.categories[catName][prodName].discountLabel =
                                prodData.discountLabel;
                        }
                    }
                }
            }

            // Zachowaj categorySettings
            if (currentData.categorySettings) {
                merged.categorySettings = currentData.categorySettings;
            }

            return merged;
        }

        case "mpnidzica": {
            const merged = { ...newData };
            if (!merged.products) merged.products = [];

            // Mapa aktualnych produktów
            const currentProducts = new Map<string, any>(
                (currentData.products || []).map((p: any) => [p.name, p])
            );

            // Zachowaj obrazki i ustawienia
            merged.products = merged.products.map((newProd: any) => {
                const currentProd = currentProducts.get(newProd.name) as any;
                if (currentProd) {
                    return {
                        ...newProd,
                        image: currentProd.image || newProd.image,
                        technicalImage:
                            currentProd.technicalImage ||
                            newProd.technicalImage,
                        previousName:
                            currentProd.previousName || newProd.previousName,
                        discount: currentProd.discount ?? newProd.discount,
                        discountLabel:
                            currentProd.discountLabel || newProd.discountLabel,
                    };
                }
                return newProd;
            });

            // Zachowaj surcharges
            if (currentData.surcharges) {
                merged.surcharges = currentData.surcharges;
            }

            return merged;
        }

        case "puszman": {
            const merged = { ...newData };

            // Zachowaj surcharges
            if (currentData.surcharges) {
                merged.surcharges = currentData.surcharges;
            }

            // Mapa aktualnych produktów
            const currentProducts = new Map<string, any>(
                (currentData.Arkusz1 || []).map((p: any) => [p.MODEL, p])
            );

            // Zachowaj previousName i discount
            if (merged.Arkusz1) {
                merged.Arkusz1 = merged.Arkusz1.map((newProd: any) => {
                    const currentProd = currentProducts.get(
                        newProd.MODEL
                    ) as any;
                    if (currentProd) {
                        return {
                            ...newProd,
                            previousName:
                                currentProd.previousName ||
                                newProd.previousName,
                            discount: currentProd.discount ?? newProd.discount,
                            discountLabel:
                                currentProd.discountLabel ||
                                newProd.discountLabel,
                        };
                    }
                    return newProd;
                });
            }

            return merged;
        }

        case "bestmeble": {
            const merged = { ...newData };

            // Zachowaj surcharges i priceGroups/dimensionLabels
            if (currentData.surcharges) {
                merged.surcharges = currentData.surcharges;
            }
            if (currentData.priceGroups) {
                merged.priceGroups = currentData.priceGroups;
            }
            if (currentData.dimensionLabels) {
                merged.dimensionLabels = currentData.dimensionLabels;
            }

            // Mapa aktualnych produktów
            const currentProducts = new Map<string, any>(
                (currentData.products || []).map((p: any) => [p.MODEL, p])
            );

            // Zachowaj previousName, discount, dimensions
            if (merged.products) {
                merged.products = merged.products.map((newProd: any) => {
                    const currentProd = currentProducts.get(
                        newProd.MODEL
                    ) as any;
                    if (currentProd) {
                        return {
                            ...newProd,
                            previousName:
                                currentProd.previousName ||
                                newProd.previousName,
                            discount: currentProd.discount ?? newProd.discount,
                            discountLabel:
                                currentProd.discountLabel ||
                                newProd.discountLabel,
                            dimensions:
                                currentProd.dimensions || newProd.dimensions,
                        };
                    }
                    return newProd;
                });
            }

            return merged;
        }

        default:
            return newData;
    }
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function AdminProducerPage({ params }: PageProps) {
    const { slug } = use(params);
    const [producer, setProducer] = useState<ProducerConfig | null>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { setHasChanges, setSaveFunction, setSaving } = useAdmin();

    // ============================================
    // DATA FETCHING
    // ============================================

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/producers/${slug}/data`);
                const result = await res.json();
                setProducer(result.producer);
                setData(result.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [slug]);

    // ============================================
    // SAVE FUNCTION
    // ============================================

    const saveData = useCallback(async () => {
        if (!data) return;
        setSaving(true);

        try {
            await fetch(`/api/producers/${slug}/data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            setHasChanges(false);
            toast.success("Zapisano pomyślnie!");
        } catch (error) {
            console.error("Error saving data:", error);
            toast.error("Błąd podczas zapisywania");
        } finally {
            setSaving(false);
        }
    }, [data, slug, setHasChanges, setSaving]);

    useEffect(() => {
        setSaveFunction(saveData);
        return () => setSaveFunction(null);
    }, [saveData, setSaveFunction]);

    // ============================================
    // UPDATE HANDLER
    // ============================================

    const updateData = (newData: any) => {
        setData(newData);
        setHasChanges(true);
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return <GoogleSpinner />;
    }

    if (!producer || !data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Nie znaleziono producenta</p>
                <Link
                    href="/admin"
                    className="text-blue-600 hover:underline mt-2 block"
                >
                    Wróć do listy
                </Link>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{
                                backgroundColor: producer.color || "#6b7280",
                            }}
                        >
                            {producer.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {producer.displayName}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Typ: {producer.layoutType}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Price Updater - AI do aktualizacji tylko cen */}
            <Suspense fallback={<EditorLoader />}>
                <SmartPriceUpdater
                    currentData={data}
                    layoutType={producer.layoutType}
                    producerSlug={producer.slug}
                    onApplyChanges={(newData) => {
                        // Zachowaj istniejące dane które nie są w PDF (np. obrazki, ustawienia)
                        const mergedData = mergeDataWithImages(
                            data,
                            newData,
                            producer.layoutType
                        );
                        updateData(mergedData);
                    }}
                />
            </Suspense>

            {/* Uniwersalny edytor - automatycznie wybiera odpowiedni */}
            <Suspense fallback={<EditorLoader />}>
                {isCategoryBasedData(data) && (
                    <UniversalCategoryEditor
                        data={data}
                        onChange={updateData}
                        producer={producer}
                    />
                )}
                {(isListBasedData(data) || isTableBasedData(data)) && (
                    <UniversalListEditor
                        data={data}
                        onChange={updateData}
                        producer={producer}
                    />
                )}
            </Suspense>
        </div>
    );
}
