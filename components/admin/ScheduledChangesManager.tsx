"use client";

import { useState, useEffect, useCallback } from "react";
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
import { toast, ConfirmDialog } from "@/components/ui";
import { clearScheduledChangesCache } from "@/hooks";
import { calculateChangesFromData } from "@/lib/scheduledChangesUtils";

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

    const fetchChanges = useCallback(async () => {
        try {
            const res = await fetch(`/api/scheduled-changes?status=pending`);
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
        } catch {
            // Ignore fetch errors
        } finally {
            setLoading(false);
        }
    }, []);

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
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                    Dziś
                </span>
            );
        }
        if (days <= 3) {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                    Za {days} {days === 1 ? "dzień" : "dni"}
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                Za {days} dni
            </span>
        );
    };

    const pendingChanges = changes.filter((c) => c.status === "pending");

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
                    <Calendar className="w-5 h-5 text-sky-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Zaplanowane zmiany cen
                    </h2>
                    {pendingChanges.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                            {pendingChanges.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Brak zmian */}
            {pendingChanges.length === 0 && (
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
                                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-sky-500"
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
                                                    className="p-1 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded"
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
                                    className="mt-3 text-sm text-sky-600 hover:text-sky-800 flex items-center gap-1"
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
