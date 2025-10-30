"use client";

import { useState, useEffect, useMemo } from "react";
import { Edit2, Save, X, Trash2, Search } from "lucide-react";
import Image from "next/image";

type ProductOverride = {
    id: string;
    manufacturer: string;
    category: string;
    productName: string;
    customName: string | null;
    priceFactor: number;
};

type ProductSize = {
    dimension: string;
    prices: string | number;
};

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

export default function FactorManager() {
    const [manufacturers, setManufacturers] = useState<string[]>([]);
    const [selectedManufacturer, setSelectedManufacturer] =
        useState<string>("");
    const [cennikData, setCennikData] = useState<CennikData | null>(null);
    const [overrides, setOverrides] = useState<ProductOverride[]>([]);
    const [editingProduct, setEditingProduct] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        customName: "",
        priceFactor: "1.0",
    });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Pobierz listę producentów
    useEffect(() => {
        const fetchManufacturers = async () => {
            try {
                const response = await fetch("/api/manufacturers");
                if (response.ok) {
                    const data = await response.json();
                    setManufacturers(data.manufacturers);
                }
            } catch (error) {
                console.error("Error fetching manufacturers:", error);
            }
        };
        fetchManufacturers();
    }, []);

    // Pobierz dane cennika i nadpisania dla wybranego producenta
    useEffect(() => {
        if (!selectedManufacturer) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const cennikResponse = await fetch(
                    `/api/cennik/${selectedManufacturer}`
                );
                if (cennikResponse.ok) {
                    const cennik = await cennikResponse.json();
                    setCennikData(cennik);
                } else {
                    console.error("Failed to fetch cennik");
                    setCennikData(null);
                }

                const overridesResponse = await fetch(
                    `/api/overrides?manufacturer=${selectedManufacturer}`
                );
                if (overridesResponse.ok) {
                    const data = await overridesResponse.json();
                    setOverrides(data.overrides);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedManufacturer]);

    const startEditing = (category: string, productName: string) => {
        const existing = overrides.find(
            (o) => o.category === category && o.productName === productName
        );
        setEditForm({
            customName: existing?.customName || "",
            priceFactor: existing?.priceFactor?.toString() || "1.0",
        });
        setEditingProduct(`${category}__${productName}`);
    };

    const saveOverride = async (category: string, productName: string) => {
        try {
            const response = await fetch("/api/overrides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    manufacturer: selectedManufacturer,
                    category,
                    productName,
                    customName: editForm.customName || null,
                    priceFactor: parseFloat(editForm.priceFactor),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setOverrides((prev) => {
                    const filtered = prev.filter(
                        (o) =>
                            !(
                                o.category === category &&
                                o.productName === productName
                            )
                    );
                    return [...filtered, data.override];
                });
                setEditingProduct(null);
            }
        } catch (error) {
            console.error("Error saving override:", error);
        }
    };

    const deleteOverride = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć to nadpisanie?")) return;

        try {
            const response = await fetch(`/api/overrides?id=${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setOverrides((prev) => prev.filter((o) => o.id !== id));
            }
        } catch (error) {
            console.error("Error deleting override:", error);
        }
    };

    const getOverride = (category: string, productName: string) => {
        return overrides.find(
            (o) => o.category === category && o.productName === productName
        );
    };

    const calculatePrice = (
        basePrice: number,
        category: string,
        productName: string
    ): number => {
        const override = getOverride(category, productName);
        const factor = override?.priceFactor || 1.0;
        return Math.round(basePrice * factor);
    };

    // Filtrowanie produktów
    const filteredCategories = useMemo(() => {
        if (!cennikData) return {};
        if (!searchQuery) return cennikData.categories;

        const query = searchQuery.toLowerCase();
        const filtered: Record<string, Record<string, ProductData>> = {};

        Object.entries(cennikData.categories).forEach(
            ([categoryName, products]) => {
                if (categoryName.toLowerCase().includes(query)) {
                    filtered[categoryName] = products;
                    return;
                }

                const matchedProducts: Record<string, ProductData> = {};
                Object.entries(products).forEach(
                    ([productName, productData]) => {
                        if (
                            productName.toLowerCase().includes(query) ||
                            productData.material
                                ?.toLowerCase()
                                .includes(query) ||
                            productData.dimensions
                                ?.toLowerCase()
                                .includes(query)
                        ) {
                            matchedProducts[productName] = productData;
                        }
                    }
                );

                if (Object.keys(matchedProducts).length > 0) {
                    filtered[categoryName] = matchedProducts;
                }
            }
        );

        return filtered;
    }, [cennikData, searchQuery]);

    if (!cennikData && selectedManufacturer && loading) {
        return (
            <div className="text-center py-8 text-gray-500">Ładowanie...</div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Wybór producenta */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Wybierz producenta:
                </label>
                <select
                    value={selectedManufacturer}
                    onChange={(e) => {
                        setSelectedManufacturer(e.target.value);
                        setSearchQuery("");
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="">-- Wybierz --</option>
                    {manufacturers.map((m) => (
                        <option key={m} value={m.toLowerCase()}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>

            {/* Wyszukiwarka */}
            {cennikData && (
                <div className="w-full max-w-2xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Szukaj produktu, kategorii, materiału..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder-gray-400 text-gray-800 transition"
                        />
                    </div>
                </div>
            )}

            {/* Produkty w grid layout */}
            {cennikData && (
                <div className="space-y-12">
                    {Object.entries(filteredCategories).map(
                        ([category, products]) => {
                            const productEntries = Object.entries(products);

                            return (
                                <div key={category} className="scroll-mt-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 capitalize">
                                        {category}:
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {productEntries.map(
                                            (
                                                [productName, productData],
                                                idx: number
                                            ) => {
                                                const override = getOverride(
                                                    category,
                                                    productName
                                                );
                                                const key = `${category}__${productName}`;
                                                const isEditing =
                                                    editingProduct === key;
                                                const displayName =
                                                    override?.customName ||
                                                    productName;
                                                const hasOverride =
                                                    override?.priceFactor &&
                                                    override.priceFactor !==
                                                        1.0;

                                                return (
                                                    <div
                                                        key={productName + idx}
                                                        className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
                                                    >
                                                        {/* Badges */}
                                                        {productData.notes && (
                                                            <span className="absolute right-4 top-4 text-xs py-1 px-3 rounded-full bg-red-600 text-white font-semibold">
                                                                {
                                                                    productData.notes
                                                                }
                                                            </span>
                                                        )}
                                                        {hasOverride && (
                                                            <span className="absolute left-4 top-4 text-xs py-1 px-3 rounded-full bg-blue-600 text-white font-semibold">
                                                                {
                                                                    override.priceFactor
                                                                }
                                                                x
                                                            </span>
                                                        )}

                                                        {/* Zdjęcie */}
                                                        <div className="flex justify-center mb-4">
                                                            {productData.image ? (
                                                                <Image
                                                                    src={
                                                                        productData.image
                                                                    }
                                                                    alt={
                                                                        displayName
                                                                    }
                                                                    height={200}
                                                                    width={200}
                                                                    className="h-48 w-48 object-contain"
                                                                />
                                                            ) : (
                                                                <div className="h-48 w-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                                                    <span className="text-gray-400 text-sm">
                                                                        Brak
                                                                        zdjęcia
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Nazwa */}
                                                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                            {displayName}
                                                        </h3>

                                                        {override?.customName && (
                                                            <p className="text-xs text-gray-500 mb-2">
                                                                Oryginalna:{" "}
                                                                {productName}
                                                            </p>
                                                        )}

                                                        {productData.material && (
                                                            <p className="text-sm font-semibold text-gray-700 mb-3">
                                                                {
                                                                    productData.material
                                                                }
                                                            </p>
                                                        )}

                                                        {productData.dimensions && (
                                                            <p className="text-sm text-gray-600 mb-3">
                                                                Wymiary:{" "}
                                                                {
                                                                    productData.dimensions
                                                                }
                                                            </p>
                                                        )}

                                                        {/* Ceny */}
                                                        {productData.prices &&
                                                            Object.keys(
                                                                productData.prices
                                                            ).length > 0 && (
                                                                <div className="border-t border-gray-200 pt-4 mb-4">
                                                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                                                        Ceny
                                                                        brutto:
                                                                    </p>
                                                                    <div>
                                                                        {Object.entries(
                                                                            productData.prices
                                                                        ).map(
                                                                            ([
                                                                                group,
                                                                                price,
                                                                            ]) => {
                                                                                const finalPrice =
                                                                                    calculatePrice(
                                                                                        price,
                                                                                        category,
                                                                                        productName
                                                                                    );
                                                                                const priceChanged =
                                                                                    finalPrice !==
                                                                                    price;

                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            group
                                                                                        }
                                                                                        className="flex justify-between text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 border-gray-100"
                                                                                    >
                                                                                        <span className="text-gray-600">
                                                                                            {
                                                                                                group
                                                                                            }

                                                                                            :
                                                                                        </span>
                                                                                        <div className="flex flex-col items-end">
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
                                                                                            {priceChanged && (
                                                                                                <span className="text-xs text-gray-400 line-through">
                                                                                                    {
                                                                                                        price
                                                                                                    }{" "}
                                                                                                    zł
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* Rozmiary (stoły) */}
                                                        {productData.sizes &&
                                                            productData.sizes
                                                                .length > 0 && (
                                                                <div className="border-t border-gray-200 pt-4 mb-4">
                                                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                                                        Dostępne
                                                                        wymiary
                                                                        i ceny
                                                                        brutto:
                                                                    </p>
                                                                    <div>
                                                                        {productData.sizes.map(
                                                                            (
                                                                                size,
                                                                                i: number
                                                                            ) => {
                                                                                const priceValue =
                                                                                    typeof size.prices ===
                                                                                    "string"
                                                                                        ? parseInt(
                                                                                              size.prices.replace(
                                                                                                  /\s/g,
                                                                                                  ""
                                                                                              )
                                                                                          )
                                                                                        : size.prices;
                                                                                const finalPrice =
                                                                                    calculatePrice(
                                                                                        priceValue,
                                                                                        category,
                                                                                        productName
                                                                                    );
                                                                                const priceChanged =
                                                                                    finalPrice !==
                                                                                    priceValue;

                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            i
                                                                                        }
                                                                                        className="text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 flex justify-between border-gray-100 py-1 last:border-0"
                                                                                    >
                                                                                        <div className="font-semibold text-gray-900">
                                                                                            {
                                                                                                size.dimension
                                                                                            }
                                                                                        </div>
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span
                                                                                                className={`${
                                                                                                    hasOverride
                                                                                                        ? "text-blue-600 font-semibold"
                                                                                                        : "text-gray-600"
                                                                                                }`}
                                                                                            >
                                                                                                {
                                                                                                    finalPrice
                                                                                                }{" "}
                                                                                                zł
                                                                                            </span>
                                                                                            {priceChanged && (
                                                                                                <span className="text-xs text-gray-400 line-through">
                                                                                                    {
                                                                                                        size.prices
                                                                                                    }{" "}
                                                                                                    zł
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* Opcje */}
                                                        {productData.options &&
                                                            productData.options
                                                                .length > 0 && (
                                                                <div className="border-t border-gray-200 pt-4 mb-4">
                                                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                                                        Dostępne
                                                                        opcje:
                                                                    </p>
                                                                    <ul className="space-y-1">
                                                                        {productData.options.map(
                                                                            (
                                                                                option,
                                                                                i: number
                                                                            ) => (
                                                                                <li
                                                                                    key={
                                                                                        i
                                                                                    }
                                                                                    className="text-xs text-gray-600 leading-relaxed"
                                                                                >
                                                                                    •{" "}
                                                                                    {
                                                                                        option
                                                                                    }
                                                                                </li>
                                                                            )
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                        {/* Przyciski edycji/usuwania */}
                                                        <div className="border-t border-gray-200 pt-4 flex gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    startEditing(
                                                                        category,
                                                                        productName
                                                                    )
                                                                }
                                                                className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                Edytuj
                                                            </button>
                                                            {override && (
                                                                <button
                                                                    onClick={() =>
                                                                        deleteOverride(
                                                                            override.id
                                                                        )
                                                                    }
                                                                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Usuń
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Formularz edycji */}
                                                        {isEditing && (
                                                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Własna
                                                                        nazwa
                                                                        (opcjonalnie)
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            editForm.customName
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            setEditForm(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    customName:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        placeholder="Zostaw puste aby użyć oryginalnej"
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Mnożnik
                                                                        cen
                                                                        (faktor)
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={
                                                                            editForm.priceFactor
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            setEditForm(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    priceFactor:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                                    />
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Przykład:
                                                                        1.1 =
                                                                        +10%,
                                                                        0.9 =
                                                                        -10%,
                                                                        1.0 =
                                                                        bez
                                                                        zmiany
                                                                    </p>
                                                                </div>

                                                                <div className="flex gap-3">
                                                                    <button
                                                                        onClick={() =>
                                                                            saveOverride(
                                                                                category,
                                                                                productName
                                                                            )
                                                                        }
                                                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                        Zapisz
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingProduct(
                                                                                null
                                                                            )
                                                                        }
                                                                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                        Anuluj
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}

            {!selectedManufacturer && (
                <div className="text-center py-16 text-gray-500">
                    Wybierz producenta aby zarządzać faktorami cen
                </div>
            )}
        </div>
    );
}
