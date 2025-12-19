"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Calendar,
    Clock,
    Trash2,
    Edit2,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Loader2,
    Play,
} from "lucide-react";
import {
    toast,
    ConfirmDialog,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui";
import { clearScheduledChangesCache } from "@/hooks";

interface ChangeItem {
    id: string;
    product: string;
    category?: string;
    element?: string;
    dimension?: string;
    priceGroup?: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
}

interface ScheduledChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    createdAt: string;
    changes: ChangeItem[];
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
    updatedData: Record<string, any>;
    status: "pending" | "applied" | "cancelled";
}

// Funkcja do obliczania zmian między aktualnymi danymi a updatedData
function calculateChangesFromData(
    currentData: any,
    updatedData: any
): { changes: ChangeItem[]; summary: ScheduledChange["summary"] } {
    const changes: ChangeItem[] = [];

    // Bomar/Halex/Furnirest layout (categories with products)
    if (updatedData?.categories && currentData?.categories) {
        for (const [catName, products] of Object.entries(
            updatedData.categories as Record<string, any>
        )) {
            for (const [prodName, prodData] of Object.entries(
                products as Record<string, any>
            )) {
                const currentProd =
                    currentData.categories?.[catName]?.[prodName];
                if (!currentProd) continue;

                // Check prices (groups like Grupa I, II...)
                if (prodData.prices && currentProd.prices) {
                    for (const [group, price] of Object.entries(
                        prodData.prices as Record<string, number>
                    )) {
                        const currentPrice = currentProd.prices[group];
                        if (
                            currentPrice !== undefined &&
                            currentPrice !== price
                        ) {
                            const percentChange =
                                ((Number(price) - Number(currentPrice)) /
                                    Number(currentPrice)) *
                                100;
                            changes.push({
                                id: `${catName}-${prodName}-${group}`,
                                product: prodName,
                                category: catName,
                                priceGroup: group,
                                oldPrice: Number(currentPrice),
                                newPrice: Number(price),
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }

                // Check sizes (dimension-based prices)
                if (prodData.sizes && currentProd.sizes) {
                    for (const newSize of prodData.sizes) {
                        const currentSize = currentProd.sizes.find(
                            (s: any) => s.dimension === newSize.dimension
                        );
                        if (!currentSize) continue;

                        const newPrice =
                            typeof newSize.prices === "object"
                                ? null
                                : Number(newSize.prices);
                        const currentPrice =
                            typeof currentSize.prices === "object"
                                ? null
                                : Number(currentSize.prices);

                        if (
                            newPrice &&
                            currentPrice &&
                            newPrice !== currentPrice
                        ) {
                            const percentChange =
                                ((newPrice - currentPrice) / currentPrice) *
                                100;
                            changes.push({
                                id: `${catName}-${prodName}-${newSize.dimension}`,
                                product: prodName,
                                category: catName,
                                dimension: newSize.dimension,
                                oldPrice: currentPrice,
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
    if (updatedData?.products && currentData?.products) {
        for (const newProd of updatedData.products) {
            const currentProd = currentData.products.find(
                (p: any) => p.name === newProd.name
            );
            if (!currentProd) continue;

            // Check elements prices
            if (newProd.elements && currentProd.elements) {
                for (const newEl of newProd.elements) {
                    // Obsługa obu formatów: {name, price} i {code, prices}
                    const elKey = newEl.code || newEl.name;
                    const currentEl = currentProd.elements.find(
                        (e: any) => (e.code || e.name) === elKey
                    );
                    if (!currentEl) continue;

                    // Format {code, prices} - obiekt z grupami cenowymi
                    if (newEl.prices && typeof newEl.prices === "object") {
                        for (const [group, price] of Object.entries(
                            newEl.prices as Record<string, number>
                        )) {
                            const currentPrice = currentEl.prices?.[group];
                            if (
                                currentPrice !== undefined &&
                                currentPrice !== price
                            ) {
                                const percentChange =
                                    ((Number(price) - Number(currentPrice)) /
                                        Number(currentPrice)) *
                                    100;
                                changes.push({
                                    id: `${newProd.name}-${elKey}-${group}`,
                                    product: newProd.name,
                                    priceGroup: `${elKey} (${group})`,
                                    oldPrice: Number(currentPrice),
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
                        currentEl.price !== undefined
                    ) {
                        if (newEl.price !== currentEl.price) {
                            const percentChange =
                                ((Number(newEl.price) -
                                    Number(currentEl.price)) /
                                    Number(currentEl.price)) *
                                100;
                            changes.push({
                                id: `${newProd.name}-${elKey}`,
                                product: newProd.name,
                                priceGroup: elKey,
                                oldPrice: Number(currentEl.price),
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
    if (updatedData?.Arkusz1 && currentData?.Arkusz1) {
        for (const newProd of updatedData.Arkusz1) {
            const currentProd = currentData.Arkusz1.find(
                (p: any) => p.MODEL === newProd.MODEL
            );
            if (!currentProd) continue;

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
                    currentProd[group] !== undefined &&
                    newProd[group] !== currentProd[group]
                ) {
                    const percentChange =
                        ((Number(newProd[group]) - Number(currentProd[group])) /
                            Number(currentProd[group])) *
                        100;
                    changes.push({
                        id: `${newProd.MODEL}-${group}`,
                        product: newProd.MODEL,
                        priceGroup: group,
                        oldPrice: Number(currentProd[group]),
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
}

export default function ScheduledChangesManager() {
    const [changes, setChanges] = useState<ScheduledChange[]>([]);
    const [currentProducerData, setCurrentProducerData] = useState<
        Record<string, any>
    >({});
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        id: string | null;
    }>({
        isOpen: false,
        id: null,
    });
    const [applyConfirm, setApplyConfirm] = useState<{
        isOpen: boolean;
        id: string | null;
    }>({
        isOpen: false,
        id: null,
    });
    const [processing, setProcessing] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const fetchChanges = useCallback(async () => {
        try {
            const status = showHistory ? "all" : "pending";
            const res = await fetch(`/api/scheduled-changes?status=${status}`);
            const data = await res.json();
            if (data.success) {
                setChanges(data.changes);

                // Pobierz aktualne dane dla każdego producenta
                const uniqueSlugs = [
                    ...new Set(
                        data.changes.map((c: ScheduledChange) => c.producerSlug)
                    ),
                ];
                const producerDataPromises = uniqueSlugs.map(async (slug) => {
                    try {
                        const res = await fetch(`/api/producers/${slug}/data`);
                        const result = await res.json();
                        return { slug, data: result.data };
                    } catch {
                        return { slug, data: null };
                    }
                });

                const producerDataResults = await Promise.all(
                    producerDataPromises
                );
                const dataMap: Record<string, any> = {};
                for (const { slug, data } of producerDataResults) {
                    if (data) {
                        dataMap[slug as string] = data;
                    }
                }
                setCurrentProducerData(dataMap);
            }
        } catch (error) {
            console.error("Error fetching scheduled changes:", error);
        } finally {
            setLoading(false);
        }
    }, [showHistory]);

    useEffect(() => {
        fetchChanges();
    }, [fetchChanges]);

    // Funkcja do uzyskania zmian dla danej zaplanowanej zmiany
    const getChangesForScheduled = useCallback(
        (change: ScheduledChange): ChangeItem[] => {
            // Jeśli są już obliczone zmiany, użyj ich
            if (change.changes && change.changes.length > 0) {
                return change.changes;
            }

            // W przeciwnym razie oblicz zmiany z updatedData
            const currentData = currentProducerData[change.producerSlug];
            if (!currentData || !change.updatedData) {
                return [];
            }

            const { changes: calculatedChanges } = calculateChangesFromData(
                currentData,
                change.updatedData
            );
            return calculatedChanges;
        },
        [currentProducerData]
    );

    // Funkcja do uzyskania summary dla danej zaplanowanej zmiany
    const getSummaryForScheduled = useCallback(
        (
            change: ScheduledChange
        ): {
            totalChanges: number;
            priceIncrease: number;
            priceDecrease: number;
        } => {
            const changes = getChangesForScheduled(change);
            if (changes.length > 0) {
                return {
                    totalChanges: changes.length,
                    priceIncrease: changes.filter((c) => c.percentChange > 0)
                        .length,
                    priceDecrease: changes.filter((c) => c.percentChange < 0)
                        .length,
                };
            }
            return {
                totalChanges: change.summary.totalChanges,
                priceIncrease: change.summary.priceIncrease,
                priceDecrease: change.summary.priceDecrease,
            };
        },
        [getChangesForScheduled]
    );

    // Usuń zaplanowaną zmianę
    const handleDelete = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/scheduled-changes?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setChanges((prev) => prev.filter((c) => c.id !== id));
                // Wyczyść cache po usunięciu
                clearScheduledChangesCache(data.producerSlug);
                toast.success("Zaplanowana zmiana została usunięta");
            } else {
                toast.error(data.error || "Błąd podczas usuwania");
            }
        } catch (error) {
            toast.error("Błąd podczas usuwania zaplanowanej zmiany");
        } finally {
            setProcessing(null);
            setDeleteConfirm({ isOpen: false, id: null });
        }
    };

    // Zmień datę
    const handleUpdateDate = async (id: string) => {
        if (!editDate) return;

        setProcessing(id);
        try {
            const res = await fetch("/api/scheduled-changes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    scheduledDate: new Date(editDate).toISOString(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setChanges((prev) =>
                    prev.map((c) =>
                        c.id === id
                            ? {
                                  ...c,
                                  scheduledDate: new Date(
                                      editDate
                                  ).toISOString(),
                              }
                            : c
                    )
                );
                // Wyczyść cache po aktualizacji daty
                clearScheduledChangesCache(data.producerSlug);
                toast.success("Data została zaktualizowana");
                setEditingId(null);
                setEditDate("");
            } else {
                toast.error(data.error || "Błąd podczas aktualizacji");
            }
        } catch (error) {
            toast.error("Błąd podczas aktualizacji daty");
        } finally {
            setProcessing(null);
        }
    };

    // Zastosuj teraz
    const handleApplyNow = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fetch("/api/scheduled-changes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, applyNow: true }),
            });
            const data = await res.json();
            if (data.success) {
                setChanges((prev) =>
                    prev.map((c) =>
                        c.id === id ? { ...c, status: "applied" } : c
                    )
                );
                // Wyczyść cache po zastosowaniu zmian
                clearScheduledChangesCache(data.producerSlug);
                toast.success("Zmiany zostały zastosowane!");
            } else {
                toast.error(data.error || "Błąd podczas stosowania zmian");
            }
        } catch (error) {
            toast.error("Błąd podczas stosowania zmian");
        } finally {
            setProcessing(null);
            setApplyConfirm({ isOpen: false, id: null });
        }
    };

    // Formatowanie daty
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    // Oblicz dni do zmiany
    const getDaysUntil = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diff;
    };

    // Status badge
    const getStatusBadge = (change: ScheduledChange) => {
        if (change.status === "applied") {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    Zastosowane
                </span>
            );
        }
        if (change.status === "cancelled") {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    Anulowane
                </span>
            );
        }
        const days = getDaysUntil(change.scheduledDate);
        if (days < 0) {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Zaległa
                </span>
            );
        }
        if (days === 0) {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                    Dziś
                </span>
            );
        }
        if (days <= 3) {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                    Za {days} {days === 1 ? "dzień" : "dni"}
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                Za {days} dni
            </span>
        );
    };

    const pendingChanges = changes.filter((c) => c.status === "pending");
    const historyChanges = changes.filter((c) => c.status !== "pending");

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Ładowanie...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Zaplanowane zmiany cen
                    </h2>
                    {pendingChanges.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            {pendingChanges.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                    {showHistory ? "Ukryj historię" : "Pokaż historię"}
                    {showHistory ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Brak zmian */}
            {pendingChanges.length === 0 && !showHistory && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                        Brak zaplanowanych zmian cen
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Zaplanuj zmiany cen w panelu edycji producenta
                    </p>
                </div>
            )}

            {/* Historia - Accordion */}
            {showHistory && historyChanges.length > 0 && (
                <Accordion
                    type="single"
                    collapsible
                    className="bg-white rounded-xl border border-gray-200"
                >
                    <AccordionItem value="history" className="border-0">
                        <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">
                                    Historia zmian
                                </span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                    {historyChanges.length}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                            <div className="space-y-2">
                                {historyChanges.map((change) => (
                                    <div
                                        key={change.id}
                                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-gray-700">
                                                {change.producerName}
                                            </span>
                                            {getStatusBadge(change)}
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-500">
                                            <span>
                                                {formatDate(
                                                    change.scheduledDate
                                                )}
                                            </span>
                                            <span>
                                                {
                                                    getSummaryForScheduled(
                                                        change
                                                    ).totalChanges
                                                }{" "}
                                                zmian
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            {/* Lista zmian pending */}
            {pendingChanges.length > 0 && (
                <div className="space-y-3">
                    {pendingChanges.map((change) => (
                        <div
                            key={change.id}
                            className="bg-white rounded-xl border transition-all duration-300 border-gray-200 hover:shadow-md"
                        >
                            {/* Header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {change.producerName}
                                            </h3>
                                            {getStatusBadge(change)}
                                        </div>

                                        {/* Data - edytowalna */}
                                        {editingId === change.id ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) =>
                                                        setEditDate(
                                                            e.target.value
                                                        )
                                                    }
                                                    min={
                                                        new Date()
                                                            .toISOString()
                                                            .split("T")[0]
                                                    }
                                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                                                />
                                                <button
                                                    onClick={() =>
                                                        handleUpdateDate(
                                                            change.id
                                                        )
                                                    }
                                                    disabled={
                                                        processing === change.id
                                                    }
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditDate("");
                                                    }}
                                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {formatDate(
                                                        change.scheduledDate
                                                    )}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(change.id);
                                                        setEditDate(
                                                            new Date(
                                                                change.scheduledDate
                                                            )
                                                                .toISOString()
                                                                .split("T")[0]
                                                        );
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Podsumowanie */}
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-center">
                                            <div className="font-semibold text-gray-900">
                                                {
                                                    getSummaryForScheduled(
                                                        change
                                                    ).totalChanges
                                                }
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                zmian
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-red-600">
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="font-medium">
                                                {
                                                    getSummaryForScheduled(
                                                        change
                                                    ).priceIncrease
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-green-600">
                                            <TrendingDown className="w-4 h-4" />
                                            <span className="font-medium">
                                                {
                                                    getSummaryForScheduled(
                                                        change
                                                    ).priceDecrease
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Akcje */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() =>
                                                setApplyConfirm({
                                                    isOpen: true,
                                                    id: change.id,
                                                })
                                            }
                                            disabled={processing === change.id}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Zastosuj teraz"
                                        >
                                            {processing === change.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDeleteConfirm({
                                                    isOpen: true,
                                                    id: change.id,
                                                })
                                            }
                                            disabled={processing === change.id}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Usuń"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Przycisk rozwiń */}
                                <button
                                    onClick={() =>
                                        setExpandedId(
                                            expandedId === change.id
                                                ? null
                                                : change.id
                                        )
                                    }
                                    className="mt-3 text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1"
                                >
                                    {expandedId === change.id ? (
                                        <>
                                            <ChevronUp className="w-4 h-4" />
                                            Zwiń szczegóły
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4" />
                                            Pokaż szczegóły (
                                            {
                                                getChangesForScheduled(change)
                                                    .length
                                            }{" "}
                                            pozycji)
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Rozwinięte szczegóły */}
                            {expandedId === change.id && (
                                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                                    <div className="max-h-64 overflow-y-auto space-y-1">
                                        {getChangesForScheduled(change).map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between py-2 px-3 bg-white rounded-lg text-sm"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium text-gray-900">
                                                            {item.product}
                                                        </span>
                                                        {item.category && (
                                                            <span className="text-gray-500 ml-2">
                                                                ({item.category}
                                                                )
                                                            </span>
                                                        )}
                                                        {(item.priceGroup ||
                                                            item.dimension) && (
                                                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                                                                {item.priceGroup ||
                                                                    item.dimension}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400 line-through">
                                                            {item.oldPrice} zł
                                                        </span>
                                                        <span className="text-gray-400">
                                                            →
                                                        </span>
                                                        <span
                                                            className={`font-semibold ${
                                                                item.percentChange >
                                                                0
                                                                    ? "text-red-600"
                                                                    : "text-green-600"
                                                            }`}
                                                        >
                                                            {item.newPrice} zł
                                                        </span>
                                                        <span
                                                            className={`text-xs px-1.5 py-0.5 rounded ${
                                                                item.percentChange >
                                                                0
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-green-100 text-green-700"
                                                            }`}
                                                        >
                                                            {item.percentChange >
                                                            0
                                                                ? "+"
                                                                : ""}
                                                            {item.percentChange.toFixed(
                                                                1
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Dialog potwierdzenia usunięcia */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
                onConfirm={() =>
                    deleteConfirm.id && handleDelete(deleteConfirm.id)
                }
                title="Usunąć zaplanowaną zmianę?"
                description="Czy na pewno chcesz usunąć tę zaplanowaną zmianę cen? Ta operacja jest nieodwracalna."
                confirmText="Usuń"
                cancelText="Anuluj"
                variant="danger"
            />

            {/* Dialog potwierdzenia zastosowania */}
            <ConfirmDialog
                isOpen={applyConfirm.isOpen}
                onClose={() => setApplyConfirm({ isOpen: false, id: null })}
                onConfirm={() =>
                    applyConfirm.id && handleApplyNow(applyConfirm.id)
                }
                title="Zastosować zmiany teraz?"
                description="Czy na pewno chcesz zastosować te zmiany teraz? Nowe ceny będą widoczne natychmiast."
                confirmText="Zastosuj"
                cancelText="Anuluj"
                variant="default"
            />
        </div>
    );
}
