"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, ExternalLink, X } from "lucide-react";
import { useAdmin } from "./AdminContext";

interface Producer {
    slug: string;
    displayName: string;
    dataFile: string;
    layoutType: "bomar" | "mpnidzica" | "puszman";
    title?: string;
    color?: string;
    priceFactor?: number;
    promotion?: {
        text: string;
        from?: string;
        to?: string;
        enabled?: boolean;
    };
}

export default function AdminPage() {
    const [producers, setProducers] = useState<Producer[]>([]);
    const [originalProducers, setOriginalProducers] = useState<Producer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const { setHasChanges, setSaveFunction, setSaving } = useAdmin();

    // Form state for adding new producer
    const [formData, setFormData] = useState({
        slug: "",
        displayName: "",
        layoutType: "bomar" as "bomar" | "mpnidzica" | "puszman",
        title: "",
        color: "#6b7280",
    });

    useEffect(() => {
        fetchProducers();
    }, []);

    // Sprawdź czy promocje powinny być wyłączone (data minęła)
    function checkPromotionExpiry(producersList: Producer[]): Producer[] {
        const today = new Date().toISOString().split("T")[0];

        return producersList.map((p) => {
            if (
                p.promotion?.enabled &&
                p.promotion.to &&
                p.promotion.to < today
            ) {
                return {
                    ...p,
                    promotion: { ...p.promotion, enabled: false },
                };
            }
            return p;
        });
    }

    async function fetchProducers() {
        try {
            const res = await fetch("/api/producers");
            const data = await res.json();
            const checked = checkPromotionExpiry(data);
            setProducers(checked);
            setOriginalProducers(JSON.parse(JSON.stringify(checked)));
        } catch (error) {
            console.error("Error fetching producers:", error);
        } finally {
            setLoading(false);
        }
    }

    // Sprawdź czy są zmiany
    useEffect(() => {
        const hasChanges =
            JSON.stringify(producers) !== JSON.stringify(originalProducers);
        setHasChanges(hasChanges);
    }, [producers, originalProducers, setHasChanges]);

    // Funkcja zapisywania
    const saveAllProducers = useCallback(async () => {
        setSaving(true);
        try {
            await fetch("/api/producers/bulk", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(producers),
            });
            setOriginalProducers(JSON.parse(JSON.stringify(producers)));
            alert("Zapisano pomyślnie!");
        } catch (error) {
            console.error("Error saving producers:", error);
            alert("Błąd podczas zapisywania");
        } finally {
            setSaving(false);
        }
    }, [producers, setSaving]);

    useEffect(() => {
        setSaveFunction(saveAllProducers);
        return () => setSaveFunction(null);
    }, [saveAllProducers, setSaveFunction]);

    function resetForm() {
        setFormData({
            slug: "",
            displayName: "",
            layoutType: "bomar",
            title: "",
            color: "#6b7280",
        });
        setShowForm(false);
    }

    function updateProducer(index: number, updates: Partial<Producer>) {
        setProducers((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
        );
    }

    function togglePromotion(index: number) {
        setProducers((prev) =>
            prev.map((p, i) => {
                if (i !== index) return p;

                const isCurrentlyEnabled = p.promotion?.enabled ?? false;

                if (!isCurrentlyEnabled) {
                    // Włączamy promocję
                    return {
                        ...p,
                        promotion: {
                            text: p.promotion?.text || "Promocja",
                            from:
                                p.promotion?.from ||
                                new Date().toISOString().split("T")[0],
                            to: p.promotion?.to || "",
                            enabled: true,
                        },
                    };
                } else {
                    // Wyłączamy promocję
                    return {
                        ...p,
                        promotion: {
                            ...p.promotion,
                            text: p.promotion?.text || "",
                            enabled: false,
                        },
                    };
                }
            })
        );
    }

    function updatePromotion(
        index: number,
        field: "text" | "from" | "to",
        value: string
    ) {
        setProducers((prev) =>
            prev.map((p, i) => {
                if (i !== index) return p;
                return {
                    ...p,
                    promotion: {
                        text: p.promotion?.text || "",
                        from: p.promotion?.from,
                        to: p.promotion?.to,
                        enabled: p.promotion?.enabled ?? false,
                        [field]: value,
                    },
                };
            })
        );
    }

    async function handleAddProducer(e: React.FormEvent) {
        e.preventDefault();

        const newProducer: Producer = {
            slug: formData.slug,
            displayName: formData.displayName,
            dataFile: `${formData.slug}.json`,
            layoutType: formData.layoutType,
            title: formData.title,
            color: formData.color,
            priceFactor: 1,
        };

        try {
            await fetch("/api/producers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newProducer),
            });
            fetchProducers();
            resetForm();
        } catch (error) {
            console.error("Error adding producer:", error);
            alert("Błąd podczas dodawania producenta");
        }
    }

    async function handleDelete(slug: string) {
        if (!confirm("Czy na pewno chcesz usunąć tego producenta?")) return;

        try {
            await fetch(`/api/producers?slug=${slug}`, {
                method: "DELETE",
            });
            fetchProducers();
        } catch (error) {
            console.error("Error deleting producer:", error);
            alert("Błąd podczas usuwania producenta");
        }
    }

    function isPromotionActive(producer: Producer): boolean {
        if (!producer.promotion?.enabled) return false;
        const today = new Date().toISOString().split("T")[0];
        const from = producer.promotion.from;
        const to = producer.promotion.to;
        if (from && today < from) return false;
        if (to && today > to) return false;
        return true;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Producenci
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {producers.length}{" "}
                        {producers.length === 1
                            ? "producent"
                            : producers.length < 5
                            ? "producentów"
                            : "producentów"}
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Dodaj producenta
                </button>
            </div>

            {/* Add Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Nowy producent
                                </h3>
                                <button
                                    onClick={resetForm}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleAddProducer}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Slug (URL)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                slug: e.target.value
                                                    .toLowerCase()
                                                    .replace(
                                                        /[^a-z0-9-]/g,
                                                        "-"
                                                    ),
                                            })
                                        }
                                        placeholder="np. nazwa-producenta"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Nazwa wyświetlana
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                displayName: e.target.value,
                                            })
                                        }
                                        placeholder="np. Nazwa Firmy"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Typ layoutu
                                    </label>
                                    <select
                                        value={formData.layoutType}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                layoutType: e.target
                                                    .value as any,
                                            })
                                        }
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                    >
                                        <option value="bomar">
                                            Bomar (kategorie z kartami)
                                        </option>
                                        <option value="mpnidzica">
                                            MP Nidzica (produkty z elementami)
                                        </option>
                                        <option value="puszman">
                                            Puszman (prosta tabela)
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tytuł cennika
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                title: e.target.value,
                                            })
                                        }
                                        placeholder="np. CENNIK STYCZEŃ 2025"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Kolor avatara
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    color: e.target.value,
                                                })
                                            }
                                            className="w-14 h-11 rounded-xl border-0 cursor-pointer shadow-inner"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    color: e.target.value,
                                                })
                                            }
                                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-600"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-200"
                                    >
                                        Dodaj producenta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Producers List */}
            <div className="space-y-3">
                {producers.map((producer, index) => (
                    <div
                        key={producer.slug}
                        className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
                            producer.promotion?.enabled
                                ? "border-green-200"
                                : "border-gray-100"
                        }`}
                    >
                        <div className="p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                {/* Left: Avatar & Basic Info */}
                                <div className="flex items-center gap-4 lg:w-72 shrink-0">
                                    <div className="relative group">
                                        <input
                                            type="color"
                                            value={producer.color || "#6b7280"}
                                            onChange={(e) =>
                                                updateProducer(index, {
                                                    color: e.target.value,
                                                })
                                            }
                                            className="w-14 h-14 rounded-2xl cursor-pointer border-0 shadow-inner"
                                            title="Zmień kolor"
                                        />
                                        <div className="absolute inset-0 rounded-2xl ring-2 ring-white ring-offset-2 ring-offset-gray-100 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text"
                                            value={producer.displayName}
                                            onChange={(e) =>
                                                updateProducer(index, {
                                                    displayName: e.target.value,
                                                })
                                            }
                                            className="font-bold text-gray-900 text-lg w-full bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                                        />
                                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                            /{producer.slug}
                                        </p>
                                    </div>
                                </div>

                                {/* Middle: Settings */}
                                <div className="flex-1 flex flex-wrap items-center gap-4">
                                    {/* Title */}
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                            Tytuł cennika
                                        </label>
                                        <input
                                            type="text"
                                            value={producer.title || ""}
                                            onChange={(e) =>
                                                updateProducer(index, {
                                                    title: e.target.value,
                                                })
                                            }
                                            placeholder="np. CENNIK 2025"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                        />
                                    </div>

                                    {/* Price Factor */}
                                    <div className="w-28">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                            Faktor
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.1"
                                                max="10"
                                                value={
                                                    producer.priceFactor ?? 1
                                                }
                                                onChange={(e) =>
                                                    updateProducer(index, {
                                                        priceFactor:
                                                            parseFloat(
                                                                e.target.value
                                                            ) || 1,
                                                    })
                                                }
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Promotion Toggle - Switch Style */}
                                    <div className="w-32">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                            Promocja
                                        </label>
                                        <button
                                            onClick={() =>
                                                togglePromotion(index)
                                            }
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                                producer.promotion?.enabled
                                                    ? isPromotionActive(
                                                          producer
                                                      )
                                                        ? "bg-green-50 text-green-600 shadow-sm shadow-green-200"
                                                        : "bg-amber-50 text-amber-600 shadow-sm shadow-amber-200"
                                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            }`}
                                        >
                                            <span
                                                className={`w-3 h-3 rounded-full transition-colors ${
                                                    producer.promotion?.enabled
                                                        ? isPromotionActive(
                                                              producer
                                                          )
                                                            ? "bg-green-500 "
                                                            : "bg-amber-500"
                                                        : "bg-gray-400"
                                                }`}
                                            />
                                            {producer.promotion?.enabled
                                                ? isPromotionActive(producer)
                                                    ? "Aktywna"
                                                    : "Planowana"
                                                : "Wyłączona"}
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center mt-5 gap-1 lg:shrink-0">
                                    <Link
                                        href={`/admin/${producer.slug}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors text-sm font-medium shadow-sm"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Produkty
                                    </Link>
                                    <Link
                                        href={`/p/${producer.slug}`}
                                        target="_blank"
                                        className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                        title="Podgląd strony"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() =>
                                            handleDelete(producer.slug)
                                        }
                                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        title="Usuń"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Promotion Details (expandable) */}
                        {producer.promotion?.enabled && (
                            <div className="px-5 pb-5 pt-4 border-t border-green-100 bg-gradient-to-r from-green-50 to-emerald-50/30">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Tekst promocji
                                        </label>
                                        <input
                                            type="text"
                                            value={
                                                producer.promotion?.text || ""
                                            }
                                            onChange={(e) =>
                                                updatePromotion(
                                                    index,
                                                    "text",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="np. -20% na wszystko"
                                            className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Od
                                        </label>
                                        <input
                                            type="date"
                                            value={
                                                producer.promotion?.from || ""
                                            }
                                            onChange={(e) =>
                                                updatePromotion(
                                                    index,
                                                    "from",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Do
                                        </label>
                                        <input
                                            type="date"
                                            value={producer.promotion?.to || ""}
                                            onChange={(e) =>
                                                updatePromotion(
                                                    index,
                                                    "to",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                        />
                                    </div>
                                </div>
                                {producer.promotion?.to &&
                                    producer.promotion.to <
                                        new Date()
                                            .toISOString()
                                            .split("T")[0] && (
                                        <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg">
                                            <span>⚠️</span> Data promocji minęła
                                            - zostanie automatycznie wyłączona
                                            przy zapisie
                                        </p>
                                    )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {producers.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-medium text-gray-600">
                        Brak producentów
                    </p>
                    <p className="text-sm mt-1">
                        Kliknij &quot;Dodaj producenta&quot; aby rozpocząć
                    </p>
                </div>
            )}
        </div>
    );
}
