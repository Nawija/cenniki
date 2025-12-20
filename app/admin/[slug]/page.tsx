"use client";

import { useState, useEffect, use, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, FileSpreadsheet } from "lucide-react";
import { toast } from "@/components/ui";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
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
const ExcelImportCenter = lazy(() =>
    import("@/components/admin").then((m) => ({ default: m.ExcelImportCenter }))
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
    const [originalData, setOriginalData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pendingAIChanges, setPendingAIChanges] = useState<{
        changes: any[];
        updatedData: Record<string, any>;
        summary: any;
    } | null>(null);
    const {
        setHasChanges,
        setSaveFunction,
        setSaving,
        setPendingChanges,
        setScheduleFunction,
    } = useAdmin();

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
                setOriginalData(JSON.parse(JSON.stringify(result.data)));
            } catch {
                // Ignore fetch errors
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
            setOriginalData(JSON.parse(JSON.stringify(data)));
            setHasChanges(false);
            setPendingAIChanges(null);
            setPendingChanges(null);
            toast.success("Zapisano pomyślnie!");
        } catch {
            toast.error("Błąd podczas zapisywania");
        } finally {
            setSaving(false);
        }
    }, [data, slug, setHasChanges, setSaving, setPendingChanges]);

    // ============================================
    // HELPER: Calculate price changes
    // ============================================

    const calculatePriceChanges = useCallback((oldData: any, newData: any) => {
        const changes: {
            id: string;
            product: string;
            category?: string;
            priceGroup?: string;
            dimension?: string;
            oldPrice: number;
            newPrice: number;
            percentChange: number;
        }[] = [];

        // Bomar/Halex/Furnirest layout (categories with products)
        if (newData.categories && oldData.categories) {
            for (const [catName, products] of Object.entries(
                newData.categories as Record<string, any>
            )) {
                for (const [prodName, prodData] of Object.entries(
                    products as Record<string, any>
                )) {
                    const oldProd = oldData.categories?.[catName]?.[prodName];
                    if (!oldProd) continue;

                    // Check prices (groups like Grupa I, II...)
                    if (prodData.prices && oldProd.prices) {
                        for (const [group, price] of Object.entries(
                            prodData.prices as Record<string, number>
                        )) {
                            const oldPrice = oldProd.prices[group];
                            if (oldPrice !== undefined && oldPrice !== price) {
                                const percentChange =
                                    ((Number(price) - Number(oldPrice)) /
                                        Number(oldPrice)) *
                                    100;
                                changes.push({
                                    id: `${catName}-${prodName}-${group}`,
                                    product: prodName,
                                    category: catName,
                                    priceGroup: group,
                                    oldPrice: Number(oldPrice),
                                    newPrice: Number(price),
                                    percentChange:
                                        Math.round(percentChange * 10) / 10,
                                });
                            }
                        }
                    }

                    // Check sizes (dimension-based prices)
                    if (prodData.sizes && oldProd.sizes) {
                        for (const newSize of prodData.sizes) {
                            const oldSize = oldProd.sizes.find(
                                (s: any) => s.dimension === newSize.dimension
                            );
                            if (!oldSize) continue;

                            const newPrice =
                                typeof newSize.prices === "object"
                                    ? null
                                    : Number(newSize.prices);
                            const oldPrice =
                                typeof oldSize.prices === "object"
                                    ? null
                                    : Number(oldSize.prices);

                            if (newPrice && oldPrice && newPrice !== oldPrice) {
                                const percentChange =
                                    ((newPrice - oldPrice) / oldPrice) * 100;
                                changes.push({
                                    id: `${catName}-${prodName}-${newSize.dimension}`,
                                    product: prodName,
                                    category: catName,
                                    dimension: newSize.dimension,
                                    oldPrice,
                                    newPrice,
                                    percentChange:
                                        Math.round(percentChange * 10) / 10,
                                });
                            }
                        }
                    }
                }
            }
        }

        // MP Nidzica layout (products array)
        if (newData.products && oldData.products) {
            for (const newProd of newData.products) {
                const oldProd = oldData.products.find(
                    (p: any) => p.name === newProd.name
                );
                if (!oldProd) continue;

                // Check elements prices
                if (newProd.elements && oldProd.elements) {
                    for (const newEl of newProd.elements) {
                        // Obsługa obu formatów: {name, price} i {code, prices}
                        const elKey = newEl.code || newEl.name;
                        const oldEl = oldProd.elements.find(
                            (e: any) => (e.code || e.name) === elKey
                        );
                        if (!oldEl) continue;

                        // Format {code, prices} - obiekt z grupami cenowymi
                        if (newEl.prices && typeof newEl.prices === "object") {
                            for (const [group, price] of Object.entries(
                                newEl.prices as Record<string, number>
                            )) {
                                const oldPrice = oldEl.prices?.[group];
                                if (
                                    oldPrice !== undefined &&
                                    oldPrice !== price
                                ) {
                                    const percentChange =
                                        ((Number(price) - Number(oldPrice)) /
                                            Number(oldPrice)) *
                                        100;
                                    changes.push({
                                        id: `${newProd.name}-${elKey}-${group}`,
                                        product: newProd.name,
                                        priceGroup: `${elKey} (${group})`,
                                        oldPrice: Number(oldPrice),
                                        newPrice: Number(price),
                                        percentChange:
                                            Math.round(percentChange * 10) / 10,
                                    });
                                }
                            }
                        }
                        // Format {name, price} - pojedyncza cena
                        else if (
                            newEl.price !== undefined &&
                            oldEl.price !== undefined
                        ) {
                            if (newEl.price !== oldEl.price) {
                                const percentChange =
                                    ((Number(newEl.price) -
                                        Number(oldEl.price)) /
                                        Number(oldEl.price)) *
                                    100;
                                changes.push({
                                    id: `${newProd.name}-${elKey}`,
                                    product: newProd.name,
                                    priceGroup: elKey,
                                    oldPrice: Number(oldEl.price),
                                    newPrice: Number(newEl.price),
                                    percentChange:
                                        Math.round(percentChange * 10) / 10,
                                });
                            }
                        }
                    }
                }
            }
        }

        // Puszman layout (Arkusz1 array)
        if (newData.Arkusz1 && oldData.Arkusz1) {
            for (const newProd of newData.Arkusz1) {
                const oldProd = oldData.Arkusz1.find(
                    (p: any) => p.MODEL === newProd.MODEL
                );
                if (!oldProd) continue;

                // Puszman używa "grupa I", "grupa II", itd.
                const priceGroups = [
                    "grupa I",
                    "grupa II",
                    "grupa III",
                    "grupa IV",
                    "grupa V",
                    "grupa VI",
                ];
                for (const group of priceGroups) {
                    if (
                        newProd[group] !== undefined &&
                        oldProd[group] !== undefined &&
                        newProd[group] !== oldProd[group]
                    ) {
                        const percentChange =
                            ((Number(newProd[group]) - Number(oldProd[group])) /
                                Number(oldProd[group])) *
                            100;
                        changes.push({
                            id: `${newProd.MODEL}-${group}`,
                            product: newProd.MODEL,
                            priceGroup: group,
                            oldPrice: Number(oldProd[group]),
                            newPrice: Number(newProd[group]),
                            percentChange: Math.round(percentChange * 10) / 10,
                        });
                    }
                }
            }
        }

        // Calculate summary
        const priceIncrease = changes.filter((c) => c.percentChange > 0).length;
        const priceDecrease = changes.filter((c) => c.percentChange < 0).length;
        const avgChangePercent =
            changes.length > 0
                ? Math.round(
                      (changes.reduce((sum, c) => sum + c.percentChange, 0) /
                          changes.length) *
                          10
                  ) / 10
                : 0;

        return {
            changes,
            summary: {
                totalChanges: changes.length,
                priceIncrease,
                priceDecrease,
                avgChangePercent,
            },
        };
    }, []);

    // ============================================
    // SCHEDULE FUNCTION
    // ============================================

    const scheduleData = useCallback(
        async (scheduledDate: string) => {
            if (!data || !producer || !originalData) return;

            try {
                // Jeśli są pendingAIChanges, użyj ich, w przeciwnym razie oblicz różnice
                let changes = pendingAIChanges?.changes;
                let summary = pendingAIChanges?.summary;

                if (!changes || changes.length === 0) {
                    // Oblicz zmiany przez porównanie data z originalData
                    const calculated = calculatePriceChanges(
                        originalData,
                        data
                    );
                    changes = calculated.changes;
                    summary = calculated.summary;
                }

                const response = await fetch("/api/scheduled-changes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        producerSlug: producer.slug,
                        producerName: producer.displayName,
                        scheduledDate: new Date(scheduledDate).toISOString(),
                        changes,
                        summary,
                        // NIE wysyłamy updatedData - oszczędność miejsca!
                        // API rekonstruuje dane z tablicy changes przy zastosowaniu
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    // Resetuj stan - cofnij do oryginalnych danych
                    setData(JSON.parse(JSON.stringify(originalData)));
                    setHasChanges(false);
                    setPendingAIChanges(null);
                    setPendingChanges(null);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                throw error;
            }
        },
        [
            data,
            producer,
            pendingAIChanges,
            originalData,
            setHasChanges,
            setPendingChanges,
            calculatePriceChanges,
        ]
    );

    useEffect(() => {
        setSaveFunction(saveData);
        setScheduleFunction(scheduleData);
        return () => {
            setSaveFunction(null);
            setScheduleFunction(null);
        };
    }, [saveData, scheduleData, setSaveFunction, setScheduleFunction]);

    // ============================================
    // UPDATE HANDLER
    // ============================================

    const updateData = (
        newData: any,
        aiChanges?: { changes: any[]; summary: any }
    ) => {
        setData(newData);
        setHasChanges(true);

        // Jeśli to zmiany z AI, zapisz je do planowania
        if (aiChanges && producer) {
            setPendingAIChanges({
                changes: aiChanges.changes,
                updatedData: newData,
                summary: aiChanges.summary,
            });
            setPendingChanges({
                producerSlug: producer.slug,
                producerName: producer.displayName,
                changes: aiChanges.changes,
                updatedData: newData,
                summary: aiChanges.summary,
            });
        }
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

            {/* Narzędzia importu - Accordion */}
            <Accordion type="single" collapsible className="w-full space-y-3">
                {/* AI aktualizacja cen z PDF */}
                <AccordionItem
                    value="ai-pdf"
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
                >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50/50 data-[state=open]:bg-violet-50/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-gray-900 text-[15px]">
                                    AI aktualizacja cen z PDF
                                </div>
                                <div className="text-sm text-gray-500 font-normal">
                                    Automatyczna analiza cennika PDF z pomocą AI
                                </div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-2 border-t border-gray-100">
                        <Suspense fallback={<EditorLoader />}>
                            <SmartPriceUpdater
                                currentData={data}
                                layoutType={producer.layoutType}
                                producerSlug={producer.slug}
                                producerName={producer.displayName}
                                onApplyChanges={(newData, aiChanges) => {
                                    const mergedData = mergeDataWithImages(
                                        data,
                                        newData,
                                        producer.layoutType
                                    );
                                    updateData(mergedData, aiChanges);
                                }}
                            />
                        </Suspense>
                    </AccordionContent>
                </AccordionItem>

                {/* Import z Excel */}
                <AccordionItem
                    value="excel"
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
                >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50/50 data-[state=open]:bg-emerald-50/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-gray-900 text-[15px]">
                                    Import z Excel
                                </div>
                                <div className="text-sm text-gray-500 font-normal">
                                    Aktualizacja cen i produktów z pliku Excel
                                </div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-2 border-t border-gray-100">
                        <Suspense fallback={<EditorLoader />}>
                            <ExcelImportCenter
                                currentData={data}
                                layoutType={producer.layoutType}
                                producerSlug={producer.slug}
                                producerName={producer.displayName}
                                onApplyChanges={(newData, excelChanges) => {
                                    const mergedData = mergeDataWithImages(
                                        data,
                                        newData,
                                        producer.layoutType
                                    );
                                    updateData(mergedData, excelChanges);
                                }}
                            />
                        </Suspense>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

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
