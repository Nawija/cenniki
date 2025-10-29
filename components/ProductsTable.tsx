"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Edit2, Save, X } from "lucide-react";
import Image from "next/image";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices: Record<string, number>;
    options?: string[];
    previousName?: string;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

type ProductOverride = {
    id: string;
    manufacturer: string;
    category: string;
    productName: string;
    customName: string | null;
    priceFactor: number;
};

export default function ProductsTable({
    products,
    manufacturer,
}: {
    products: CennikData;
    manufacturer: string;
}) {
    const [search, setSearch] = useState("");
    const [overrides, setOverrides] = useState<Record<string, ProductOverride>>(
        {}
    );
    const [editingProduct, setEditingProduct] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        customName: "",
        priceFactor: "1.0",
    });
    const [loading, setLoading] = useState(true);

    const categories = products.categories || {};

    // Pobierz nadpisania z bazy danych
    useEffect(() => {
        const fetchOverrides = async () => {
            try {
                const response = await fetch(
                    `/api/overrides?manufacturer=${manufacturer}`
                );
                if (response.ok) {
                    const data = await response.json();
                    const overridesMap: Record<string, ProductOverride> = {};
                    data.overrides.forEach((override: ProductOverride) => {
                        const key = `${override.category}__${override.productName}`;
                        overridesMap[key] = override;
                    });
                    setOverrides(overridesMap);
                }
            } catch (error) {
                console.error("Error fetching overrides:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOverrides();
    }, [manufacturer]);

    // Funkcja do zapisu nadpisania
    const saveOverride = async (category: string, productName: string) => {
        try {
            const response = await fetch("/api/overrides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    manufacturer,
                    category,
                    productName,
                    customName: editForm.customName || null,
                    priceFactor: parseFloat(editForm.priceFactor),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const key = `${category}__${productName}`;
                setOverrides((prev) => ({ ...prev, [key]: data.override }));
                setEditingProduct(null);
            }
        } catch (error) {
            console.error("Error saving override:", error);
        }
    };

    // Funkcja do rozpoczęcia edycji
    const startEditing = (category: string, productName: string) => {
        const key = `${category}__${productName}`;
        const override = overrides[key];
        setEditForm({
            customName: override?.customName || "",
            priceFactor: override?.priceFactor?.toString() || "1.0",
        });
        setEditingProduct(key);
    };

    // Funkcja do obliczenia ceny z faktorem
    const calculatePrice = (
        basePrice: number,
        category: string,
        productName: string
    ): number => {
        const key = `${category}__${productName}`;
        const override = overrides[key];
        const factor = override?.priceFactor || 1.0;
        return Math.round(basePrice * factor);
    };

    // Funkcja do pobrania nazwy produktu (oryginalna lub custom)
    const getProductName = (originalName: string, category: string): string => {
        const key = `${category}__${originalName}`;
        const override = overrides[key];
        return override?.customName || originalName;
    };

    const filteredCategories = useMemo(() => {
        if (!search) return categories;
        const lowerSearch = search.toLowerCase();
        const filtered: Record<string, Record<string, ProductData>> = {};
        Object.entries(categories).forEach(([category, items]) => {
            if (category.toLowerCase().includes(lowerSearch)) {
                filtered[category] = items;
            } else {
                const matchedItems: Record<string, ProductData> = {};
                Object.entries(items).forEach(([name, data]) => {
                    if (name.toLowerCase().includes(lowerSearch)) {
                        matchedItems[name] = data;
                    }
                });
                if (Object.keys(matchedItems).length > 0) {
                    filtered[category] = matchedItems;
                }
            }
        });
        return filtered;
    }, [categories, search]);

    const priceGroups = useMemo(() => {
        for (const category of Object.values(categories)) {
            for (const product of Object.values(category)) {
                return Object.keys(product.prices);
            }
        }
        return [];
    }, [categories]);

    if (loading) {
        return (
            <div className="text-center py-8 text-gray-500">Ładowanie...</div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Modal edycji */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Edytuj produkt
                            </h3>
                            <button
                                onClick={() => setEditingProduct(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Własna nazwa (opcjonalnie)
                                </label>
                                <input
                                    type="text"
                                    value={editForm.customName}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            customName: e.target.value,
                                        }))
                                    }
                                    placeholder="Zostaw puste aby użyć oryginalnej"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mnożnik cen (faktor)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={editForm.priceFactor}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            priceFactor: e.target.value,
                                        }))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Przykład: 1.1 = +10%, 0.9 = -10%, 1.0 = bez
                                    zmiany
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    const [cat, prod] =
                                        editingProduct.split("__");
                                    saveOverride(cat, prod);
                                }}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Zapisz
                            </button>
                            <button
                                onClick={() => setEditingProduct(null)}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-xl mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Szukaj produktu lub kategorii..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder-gray-400 text-gray-800 transition"
                    />
                </div>
            </div>
            <div className="space-y-8">
                {Object.entries(filteredCategories).map(([category, items]) => (
                    <div
                        key={category}
                        id={category}
                        className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                    >
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                            <h2 className="text-2xl font-bold text-gray-800 capitalize">
                                {category}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Produkt
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Materiał
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Wymiary
                                        </th>
                                        {priceGroups.map((group) => (
                                            <th
                                                key={group}
                                                className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                            >
                                                {group}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {Object.entries(items).map(
                                        ([name, data], idx) => (
                                            <tr
                                                key={idx}
                                                className="hover:bg-blue-50 transition-colors"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {data.image ? (
                                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                                <Image
                                                                    src={
                                                                        data.image
                                                                    }
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="64px"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-300 flex-shrink-0"></div>
                                                        )}

                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-semibold text-gray-900">
                                                                    {getProductName(
                                                                        name,
                                                                        category
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        startEditing(
                                                                            category,
                                                                            name
                                                                        )
                                                                    }
                                                                    className="text-blue-500 hover:text-blue-700 p-1"
                                                                    title="Edytuj"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            {overrides[
                                                                `${category}__${name}`
                                                            ]?.customName && (
                                                                <div className="text-xs text-gray-500">
                                                                    oryginalna:{" "}
                                                                    {name}
                                                                </div>
                                                            )}
                                                            {data.previousName && (
                                                                <div className="text-xs text-gray-500">
                                                                    poprzednio:{" "}
                                                                    {
                                                                        data.previousName
                                                                    }
                                                                </div>
                                                            )}
                                                            {overrides[
                                                                `${category}__${name}`
                                                            ]?.priceFactor !==
                                                                1.0 && (
                                                                <div className="text-xs text-blue-600 font-medium">
                                                                    faktor:{" "}
                                                                    {
                                                                        overrides[
                                                                            `${category}__${name}`
                                                                        ]
                                                                            ?.priceFactor
                                                                    }
                                                                    x
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                                                    {data.material || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    {data.dimensions || "-"}
                                                </td>
                                                {priceGroups.map((group) => {
                                                    const basePrice =
                                                        data.prices[group];
                                                    const finalPrice = basePrice
                                                        ? calculatePrice(
                                                              basePrice,
                                                              category,
                                                              name
                                                          )
                                                        : null;
                                                    const hasOverride =
                                                        overrides[
                                                            `${category}__${name}`
                                                        ]?.priceFactor !== 1.0;

                                                    return (
                                                        <td
                                                            key={group}
                                                            className="px-4 py-4 text-center"
                                                        >
                                                            {finalPrice ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span
                                                                        className={`font-semibold ${
                                                                            hasOverride
                                                                                ? "text-blue-600"
                                                                                : "text-gray-900"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            finalPrice
                                                                        }{" "}
                                                                        zł
                                                                    </span>
                                                                    {hasOverride &&
                                                                        basePrice !==
                                                                            finalPrice && (
                                                                            <span className="text-xs text-gray-500 line-through">
                                                                                {
                                                                                    basePrice
                                                                                }{" "}
                                                                                zł
                                                                            </span>
                                                                        )}
                                                                </div>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {Object.values(items).some(
                            (item) => item.options && item.options.length > 0
                        ) && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                                    Informacje dodatkowe:
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    {Object.values(items)
                                        .flatMap((item) => item.options || [])
                                        .filter(
                                            (option, idx, arr) =>
                                                arr.indexOf(option) === idx
                                        )
                                        .map((option, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2"
                                            >
                                                <span className="text-blue-500 mt-1">
                                                    •
                                                </span>
                                                <span>{option}</span>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
                {Object.keys(filteredCategories).length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl shadow-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">
                            Brak wyników dla:{" "}
                            <span className="font-semibold text-gray-700">
                                {search}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
