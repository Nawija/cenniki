"use client";

import { useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    Upload,
    Save,
    AlertCircle,
} from "lucide-react";

interface ManufacturerEditorAdvancedProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
}

export default function ManufacturerEditorAdvanced({
    initialData,
    manufacturerName,
    onSave,
}: ManufacturerEditorAdvancedProps) {
    const [data, setData] = useState(initialData);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set()
    );
    const [editingCategoryName, setEditingCategoryName] = useState<
        string | null
    >(null);

    // Detect structure type
    const isNestedStructure =
        data.categories && typeof data.categories === "object";
    const isFlatStructure =
        !isNestedStructure && Object.values(data).some((v) => Array.isArray(v));

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(data);
            setMessage({ type: "success", text: "Zapisano!" });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Błąd podczas zapisywania",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (path: string[], file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("manufacturer", manufacturerName);
        formData.append("category", path[0] || "general");

        try {
            const response = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const newData = JSON.parse(JSON.stringify(data));
            let current = newData;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = result.path;
            setData(newData);

            setMessage({ type: "success", text: "Zdjęcie wgrane!" });
            setTimeout(() => setMessage(null), 2000);
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Błąd podczas wgrywania zdjęcia",
            });
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                    {manufacturerName}
                </h1>
                <p className="text-gray-600 mt-2">Edytuj katalog produktów</p>
            </div>

            {/* Messages */}
            {message && (
                <div
                    className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                        message.type === "success"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                >
                    <AlertCircle size={20} />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                >
                    <Save size={20} />
                    {saving ? "Zapisywanie..." : "Zapisz"}
                </button>
            </div>

            {/* Categories and Products */}
            <div className="space-y-4">
                {!isNestedStructure ? (
                    <div className="text-center py-12 text-gray-500">
                        <AlertCircle
                            size={48}
                            className="mx-auto mb-4 text-gray-400"
                        />
                        <p>Struktura nie obsługiwana w tym edytorze</p>
                    </div>
                ) : (
                    Object.keys(data.categories || {}).map((category) => (
                        <div
                            key={category}
                            className="border border-gray-200 rounded-lg"
                        >
                            <div
                                onClick={() => toggleCategory(category)}
                                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedCategories.has(category) ? (
                                        <ChevronDown size={20} />
                                    ) : (
                                        <ChevronRight size={20} />
                                    )}
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {category}
                                    </h3>
                                    <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded">
                                        {
                                            Object.keys(
                                                data.categories[category]
                                            ).length
                                        }{" "}
                                        produktów
                                    </span>
                                </div>
                            </div>

                            {expandedCategories.has(category) && (
                                <div className="p-4 space-y-4 bg-white">
                                    {Object.entries(
                                        data.categories[category]
                                    ).map(
                                        ([productName, product]: [
                                            string,
                                            any
                                        ]) => (
                                            <div
                                                key={productName}
                                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                                            >
                                                {/* Product Header */}
                                                <div className="mb-4 pb-3 border-b">
                                                    <h4 className="text-lg font-semibold text-gray-900">
                                                        {productName}
                                                    </h4>
                                                </div>

                                                {/* Product Image */}
                                                <div className="mb-4">
                                                    {product?.image ? (
                                                        <div className="relative">
                                                            <img
                                                                src={
                                                                    product.image
                                                                }
                                                                alt={
                                                                    productName
                                                                }
                                                                className="w-full h-40 object-cover rounded-lg"
                                                            />
                                                            <label className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
                                                                <Upload
                                                                    size={16}
                                                                />
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const file =
                                                                            e
                                                                                .target
                                                                                .files?.[0];
                                                                        if (
                                                                            file
                                                                        )
                                                                            handleImageUpload(
                                                                                [
                                                                                    "categories",
                                                                                    category,
                                                                                    productName,
                                                                                    "image",
                                                                                ],
                                                                                file
                                                                            );
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <label className="flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition">
                                                            <div className="flex flex-col items-center">
                                                                <Upload
                                                                    size={24}
                                                                    className="text-gray-400"
                                                                />
                                                                <span className="text-sm text-gray-600 mt-2">
                                                                    Wgraj
                                                                    zdjęcie
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    const file =
                                                                        e.target
                                                                            .files?.[0];
                                                                    if (file)
                                                                        handleImageUpload(
                                                                            [
                                                                                "categories",
                                                                                category,
                                                                                productName,
                                                                                "image",
                                                                            ],
                                                                            file
                                                                        );
                                                                }}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Product Fields */}
                                                <div className="space-y-3">
                                                    {product?.material && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Materiał
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    product.material ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    const newData =
                                                                        JSON.parse(
                                                                            JSON.stringify(
                                                                                data
                                                                            )
                                                                        );
                                                                    newData.categories[
                                                                        category
                                                                    ][
                                                                        productName
                                                                    ].material =
                                                                        e.target.value;
                                                                    setData(
                                                                        newData
                                                                    );
                                                                }}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    )}

                                                    {product?.description &&
                                                        Array.isArray(
                                                            product.description
                                                        ) && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Opis (linia
                                                                    po linii)
                                                                </label>
                                                                <textarea
                                                                    value={product.description.join(
                                                                        "\n"
                                                                    )}
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const newData =
                                                                            JSON.parse(
                                                                                JSON.stringify(
                                                                                    data
                                                                                )
                                                                            );
                                                                        newData.categories[
                                                                            category
                                                                        ][
                                                                            productName
                                                                        ].description =
                                                                            e.target.value
                                                                                .split(
                                                                                    "\n"
                                                                                )
                                                                                .filter(
                                                                                    (
                                                                                        line
                                                                                    ) =>
                                                                                        line.trim()
                                                                                );
                                                                        setData(
                                                                            newData
                                                                        );
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                                                />
                                                            </div>
                                                        )}

                                                    {product?.sizes &&
                                                        Array.isArray(
                                                            product.sizes
                                                        ) && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Rozmiary
                                                                </label>
                                                                <div className="space-y-2">
                                                                    {product.sizes.map(
                                                                        (
                                                                            size: any,
                                                                            idx: number
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="flex gap-2"
                                                                            >
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Wymiar"
                                                                                    value={
                                                                                        size.dimension ||
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) => {
                                                                                        const newData =
                                                                                            JSON.parse(
                                                                                                JSON.stringify(
                                                                                                    data
                                                                                                )
                                                                                            );
                                                                                        newData.categories[
                                                                                            category
                                                                                        ][
                                                                                            productName
                                                                                        ].sizes[
                                                                                            idx
                                                                                        ].dimension =
                                                                                            e.target.value;
                                                                                        setData(
                                                                                            newData
                                                                                        );
                                                                                    }}
                                                                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Cena"
                                                                                    value={
                                                                                        size.prices ||
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) => {
                                                                                        const newData =
                                                                                            JSON.parse(
                                                                                                JSON.stringify(
                                                                                                    data
                                                                                                )
                                                                                            );
                                                                                        newData.categories[
                                                                                            category
                                                                                        ][
                                                                                            productName
                                                                                        ].sizes[
                                                                                            idx
                                                                                        ].prices =
                                                                                            e.target.value;
                                                                                        setData(
                                                                                            newData
                                                                                        );
                                                                                    }}
                                                                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                                />
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newData =
                                                                                            JSON.parse(
                                                                                                JSON.stringify(
                                                                                                    data
                                                                                                )
                                                                                            );
                                                                                        newData.categories[
                                                                                            category
                                                                                        ][
                                                                                            productName
                                                                                        ].sizes =
                                                                                            newData.categories[
                                                                                                category
                                                                                            ][
                                                                                                productName
                                                                                            ].sizes.filter(
                                                                                                (
                                                                                                    _: any,
                                                                                                    i: number
                                                                                                ) =>
                                                                                                    i !==
                                                                                                    idx
                                                                                            );
                                                                                        setData(
                                                                                            newData
                                                                                        );
                                                                                    }}
                                                                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                                                                                >
                                                                                    <Trash2
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                    />
                                                                                </button>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            const newData =
                                                                                JSON.parse(
                                                                                    JSON.stringify(
                                                                                        data
                                                                                    )
                                                                                );
                                                                            newData.categories[
                                                                                category
                                                                            ][
                                                                                productName
                                                                            ].sizes.push(
                                                                                {
                                                                                    dimension:
                                                                                        "",
                                                                                    prices: "",
                                                                                }
                                                                            );
                                                                            setData(
                                                                                newData
                                                                            );
                                                                        }}
                                                                        className="text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-sm"
                                                                    >
                                                                        + Dodaj
                                                                        rozmiar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                    {product?.prices &&
                                                        typeof product.prices ===
                                                            "object" &&
                                                        !Array.isArray(
                                                            product.prices
                                                        ) && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Ceny
                                                                </label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {Object.entries(
                                                                        product.prices
                                                                    ).map(
                                                                        ([
                                                                            priceKey,
                                                                            value,
                                                                        ]: [
                                                                            string,
                                                                            any
                                                                        ]) => (
                                                                            <div
                                                                                key={
                                                                                    priceKey
                                                                                }
                                                                            >
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    {
                                                                                        priceKey
                                                                                    }
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={
                                                                                        value ||
                                                                                        0
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) => {
                                                                                        const newData =
                                                                                            JSON.parse(
                                                                                                JSON.stringify(
                                                                                                    data
                                                                                                )
                                                                                            );
                                                                                        newData.categories[
                                                                                            category
                                                                                        ][
                                                                                            productName
                                                                                        ].prices[
                                                                                            priceKey
                                                                                        ] =
                                                                                            parseFloat(
                                                                                                e
                                                                                                    .target
                                                                                                    .value
                                                                                            ) ||
                                                                                            0;
                                                                                        setData(
                                                                                            newData
                                                                                        );
                                                                                    }}
                                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                                />
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {product?.options &&
                                                        Array.isArray(
                                                            product.options
                                                        ) && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Opcje
                                                                </label>
                                                                <textarea
                                                                    value={product.options.join(
                                                                        "\n"
                                                                    )}
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const newData =
                                                                            JSON.parse(
                                                                                JSON.stringify(
                                                                                    data
                                                                                )
                                                                            );
                                                                        newData.categories[
                                                                            category
                                                                        ][
                                                                            productName
                                                                        ].options =
                                                                            e.target.value
                                                                                .split(
                                                                                    "\n"
                                                                                )
                                                                                .filter(
                                                                                    (
                                                                                        line
                                                                                    ) =>
                                                                                        line.trim()
                                                                                );
                                                                        setData(
                                                                            newData
                                                                        );
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                                                />
                                                            </div>
                                                        )}
                                                </div>

                                                {/* Delete Product */}
                                                <button
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                `Usunąć produkt "${productName}"?`
                                                            )
                                                        ) {
                                                            const newData =
                                                                JSON.parse(
                                                                    JSON.stringify(
                                                                        data
                                                                    )
                                                                );
                                                            delete newData
                                                                .categories[
                                                                category
                                                            ][productName];
                                                            setData(newData);
                                                        }
                                                    }}
                                                    className="mt-4 w-full px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2"
                                                >
                                                    <Trash2 size={16} />
                                                    Usuń produkt
                                                </button>
                                            </div>
                                        )
                                    )}

                                    {/* Add Product */}
                                    <button
                                        onClick={() => {
                                            const productName = prompt(
                                                "Nazwa nowego produktu:"
                                            );
                                            if (productName) {
                                                const newData = JSON.parse(
                                                    JSON.stringify(data)
                                                );
                                                newData.categories[category][
                                                    productName
                                                ] = {
                                                    image: "",
                                                    material: "",
                                                    sizes: [],
                                                    prices: {},
                                                    options: [],
                                                    description: [],
                                                };
                                                setData(newData);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Dodaj produkt
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
