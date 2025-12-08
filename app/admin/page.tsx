"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, ExternalLink, Tag } from "lucide-react";

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
    };
}

export default function AdminPage() {
    const [producers, setProducers] = useState<Producer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProducer, setEditingProducer] = useState<Producer | null>(
        null
    );

    // Form state
    const [formData, setFormData] = useState({
        slug: "",
        displayName: "",
        layoutType: "bomar" as "bomar" | "mpnidzica" | "puszman",
        title: "",
        color: "#6b7280",
        priceFactor: 1,
        promotionText: "",
        promotionFrom: "",
        promotionTo: "",
    });

    useEffect(() => {
        fetchProducers();
    }, []);

    async function fetchProducers() {
        try {
            const res = await fetch("/api/producers");
            const data = await res.json();
            setProducers(data);
        } catch (error) {
            console.error("Error fetching producers:", error);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setFormData({
            slug: "",
            displayName: "",
            layoutType: "bomar",
            title: "",
            color: "#6b7280",
            priceFactor: 1,
            promotionText: "",
            promotionFrom: "",
            promotionTo: "",
        });
        setEditingProducer(null);
        setShowForm(false);
    }

    function openEditForm(producer: Producer) {
        setFormData({
            slug: producer.slug,
            displayName: producer.displayName,
            layoutType: producer.layoutType,
            title: producer.title || "",
            color: producer.color || "#6b7280",
            priceFactor: producer.priceFactor ?? 1,
            promotionText: producer.promotion?.text || "",
            promotionFrom: producer.promotion?.from || "",
            promotionTo: producer.promotion?.to || "",
        });
        setEditingProducer(producer);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const payload: any = {
            slug: formData.slug,
            displayName: formData.displayName,
            layoutType: formData.layoutType,
            title: formData.title,
            color: formData.color,
            priceFactor: formData.priceFactor,
        };

        if (formData.promotionText) {
            payload.promotion = {
                text: formData.promotionText,
                from: formData.promotionFrom || undefined,
                to: formData.promotionTo || undefined,
            };
        }

        try {
            if (editingProducer) {
                // Aktualizuj
                await fetch("/api/producers", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                // Dodaj nowego
                await fetch("/api/producers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            fetchProducers();
            resetForm();
        } catch (error) {
            console.error("Error saving producer:", error);
            alert("Błąd podczas zapisywania producenta");
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                    Zarządzaj producentami
                </h2>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Dodaj producenta
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-6">
                                {editingProducer
                                    ? "Edytuj producenta"
                                    : "Nowy producent"}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Slug */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                        disabled={!!editingProducer}
                                        placeholder="np. nazwa-producenta"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        required
                                    />
                                </div>

                                {/* Display Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Layout Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                        disabled={!!editingProducer}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    >
                                        <option value="bomar">
                                            Bomar (kategorie z kartami
                                            produktów)
                                        </option>
                                        <option value="mpnidzica">
                                            MP Nidzica (produkty z elementami)
                                        </option>
                                        <option value="puszman">
                                            Puszman (prosta tabela)
                                        </option>
                                    </select>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Kolor avatara
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    color: e.target.value,
                                                })
                                            }
                                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
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
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Pricing Options - tylko dla Bomar */}
                                {formData.layoutType === "bomar" && (
                                    <div className="border-t pt-4 mt-4">
                                        <h4 className="font-medium text-gray-900 mb-3">
                                            Opcje cenowe (Bomar)
                                        </h4>

                                        <div className="space-y-3">
                                            {/* Price Factor */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Mnożnik cen (faktor)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.1"
                                                        max="10"
                                                        value={
                                                            formData.priceFactor
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                priceFactor:
                                                                    parseFloat(
                                                                        e.target
                                                                            .value
                                                                    ) || 1,
                                                            })
                                                        }
                                                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                                                    />
                                                    <span className="text-sm text-gray-500">
                                                        (1.0 = bez zmiany, 1.1 =
                                                        +10%, 0.9 = -10%)
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                💡 Dopłaty (np. łączenie
                                                kolorów, wybarwienie) konfiguruj
                                                w edytorze produktów przy każdej
                                                kategorii.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Promotion */}
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <Tag className="w-4 h-4" />
                                        Promocja (opcjonalnie)
                                    </h4>

                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={formData.promotionText}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    promotionText:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="Tekst promocji, np. -20% na wszystko"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Od
                                                </label>
                                                <input
                                                    type="date"
                                                    value={
                                                        formData.promotionFrom
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            promotionFrom:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Do
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.promotionTo}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            promotionTo:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {editingProducer ? "Zapisz" : "Dodaj"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Producers List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {producers.map((producer) => (
                    <div
                        key={producer.slug}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                                style={{
                                    backgroundColor:
                                        producer.color || "#6b7280",
                                }}
                            >
                                {producer.displayName.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between w-full">
                                    <h3 className="font-bold text-gray-900 text-lg">
                                        {producer.displayName}
                                    </h3>

                                    {producer.title && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {producer.title}
                                        </p>
                                    )}
                                </div>
                                {producer.promotion && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        {producer.promotion.text}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                            <Link
                                href={`/admin/${producer.slug}`}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edytuj produkty
                            </Link>
                            <button
                                onClick={() => openEditForm(producer)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edytuj ustawienia"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <Link
                                href={`/p/${producer.slug}`}
                                target="_blank"
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Podgląd strony"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={() => handleDelete(producer.slug)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Usuń"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {producers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">Brak producentów</p>
                    <p className="text-sm mt-1">
                        Kliknij &quot;Dodaj producenta&quot; aby rozpocząć
                    </p>
                </div>
            )}
        </div>
    );
}
