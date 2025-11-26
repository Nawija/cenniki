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

export interface MpNidzicaEditorProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
}

export default function MpNidzicaEditor({
    initialData,
    manufacturerName,
    onSave,
}: MpNidzicaEditorProps) {
    const [data, setData] = useState(initialData);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set()
    );

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

    const handleImageUpload = async (
        category: string,
        productName: string,
        imageField: string,
        file: File
    ) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("manufacturer", manufacturerName);
        formData.append("category", category);

        try {
            const response = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const newData = JSON.parse(JSON.stringify(data));
            newData.categories[category][productName][imageField] = result.path;
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

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const categories = Object.keys(data.categories || {});

    return (
        <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                    {manufacturerName}
                </h1>
                <p className="text-gray-600 mt-2">
                    Edytuj katalog meble/elementy/ceny
                </p>
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

            {/* Categories */}
            <div className="space-y-4">
                {categories.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Brak kategorii
                    </div>
                ) : (
                    categories.map((category) => (
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
                                                className="border border-gray-200 rounded-lg p-4"
                                            >
                                                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                                    {productName}
                                                </h4>

                                                <div className="space-y-4">
                                                    {/* Main Image */}
                                                    {product?.image !==
                                                        undefined && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Zdjęcie produktu
                                                            </label>
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
                                                                    <label className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                                                                        <Upload
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const file =
                                                                                    e
                                                                                        .target
                                                                                        .files?.[0];
                                                                                if (
                                                                                    file
                                                                                ) {
                                                                                    handleImageUpload(
                                                                                        category,
                                                                                        productName,
                                                                                        "image",
                                                                                        file
                                                                                    );
                                                                                }
                                                                            }}
                                                                        />
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <label className="flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                                                                    <div className="flex flex-col items-center">
                                                                        <Upload
                                                                            size={
                                                                                24
                                                                            }
                                                                        />
                                                                        <span className="text-sm text-gray-600 mt-2">
                                                                            Wgraj
                                                                            zdjęcie
                                                                            produktu
                                                                        </span>
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const file =
                                                                                e
                                                                                    .target
                                                                                    .files?.[0];
                                                                            if (
                                                                                file
                                                                            ) {
                                                                                handleImageUpload(
                                                                                    category,
                                                                                    productName,
                                                                                    "image",
                                                                                    file
                                                                                );
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Technical Image */}
                                                    {product?.technicalImage !==
                                                        undefined && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Zdjęcie
                                                                techniczne /
                                                                wymiary
                                                            </label>
                                                            {product?.technicalImage ? (
                                                                <div className="relative">
                                                                    <img
                                                                        src={
                                                                            product.technicalImage
                                                                        }
                                                                        alt="Technical"
                                                                        className="w-full h-40 object-cover rounded-lg"
                                                                    />
                                                                    <label className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                                                                        <Upload
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const file =
                                                                                    e
                                                                                        .target
                                                                                        .files?.[0];
                                                                                if (
                                                                                    file
                                                                                ) {
                                                                                    handleImageUpload(
                                                                                        category,
                                                                                        productName,
                                                                                        "technicalImage",
                                                                                        file
                                                                                    );
                                                                                }
                                                                            }}
                                                                        />
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <label className="flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                                                                    <div className="flex flex-col items-center">
                                                                        <Upload
                                                                            size={
                                                                                24
                                                                            }
                                                                        />
                                                                        <span className="text-sm text-gray-600 mt-2">
                                                                            Wgraj
                                                                            zdjęcie
                                                                            techniczne
                                                                        </span>
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const file =
                                                                                e
                                                                                    .target
                                                                                    .files?.[0];
                                                                            if (
                                                                                file
                                                                            ) {
                                                                                handleImageUpload(
                                                                                    category,
                                                                                    productName,
                                                                                    "technicalImage",
                                                                                    file
                                                                                );
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Description */}
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

                                                    {/* Elements Table */}
                                                    {product?.elements &&
                                                        typeof product.elements ===
                                                            "object" &&
                                                        !Array.isArray(
                                                            product.elements
                                                        ) && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Elementy z cenami
                                                                </label>
                                                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                                                    <table className="w-full text-sm">
                                                                        <thead>
                                                                            <tr className="bg-blue-100 border-b">
                                                                                <th className="px-3 py-2 text-left font-semibold text-gray-900">
                                                                                    Element
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Ilość
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Grupa 1
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Grupa 2
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Grupa 3
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Grupa 4
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Grupa 5
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                                    Grupa 6
                                                                                </th>
                                                                                <th className="px-3 py-2 text-center font-semibold text-gray-900">
                                                                                    Akcja
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {Object.entries(
                                                                                product.elements
                                                                            ).map(
                                                                                (
                                                                                    [
                                                                                        elementName,
                                                                                        elementData,
                                                                                    ]: [
                                                                                        string,
                                                                                        any
                                                                                    ]
                                                                                ) => (
                                                                                    <tr
                                                                                        key={
                                                                                            elementName
                                                                                        }
                                                                                        className="border-b hover:bg-blue-50"
                                                                                    >
                                                                                        <td className="px-3 py-2 font-medium text-gray-900">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={
                                                                                                    elementName ||
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
                                                                                                    const oldName =
                                                                                                        elementName;
                                                                                                    const newName =
                                                                                                        e.target
                                                                                                            .value;
                                                                                                    if (
                                                                                                        newName !==
                                                                                                        oldName
                                                                                                    ) {
                                                                                                        newData.categories[
                                                                                                            category
                                                                                                        ][
                                                                                                            productName
                                                                                                        ].elements[
                                                                                                            newName
                                                                                                        ] =
                                                                                                            newData.categories[
                                                                                                                category
                                                                                                            ][
                                                                                                                productName
                                                                                                            ].elements[
                                                                                                                oldName
                                                                                                            ];
                                                                                                        delete newData.categories[
                                                                                                            category
                                                                                                        ][
                                                                                                            productName
                                                                                                        ].elements[
                                                                                                            oldName
                                                                                                        ];
                                                                                                        setData(
                                                                                                            newData
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                            />
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-right">
                                                                                            <input
                                                                                                type="number"
                                                                                                value={
                                                                                                    elementData.quantity ||
                                                                                                    1
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
                                                                                                    ].elements[
                                                                                                        elementName
                                                                                                    ].quantity =
                                                                                                        parseInt(
                                                                                                            e
                                                                                                                .target
                                                                                                                .value
                                                                                                        ) ||
                                                                                                        1;
                                                                                                    setData(
                                                                                                        newData
                                                                                                    );
                                                                                                }}
                                                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                            />
                                                                                        </td>
                                                                                        {[
                                                                                            "grupa1",
                                                                                            "grupa2",
                                                                                            "grupa3",
                                                                                            "grupa4",
                                                                                            "grupa5",
                                                                                            "grupa6",
                                                                                        ].map(
                                                                                            (
                                                                                                grupa
                                                                                            ) => (
                                                                                                <td
                                                                                                    key={
                                                                                                        grupa
                                                                                                    }
                                                                                                    className="px-3 py-2 text-right"
                                                                                                >
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        value={
                                                                                                            elementData
                                                                                                                .prices?.[
                                                                                                                grupa
                                                                                                            ] ||
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
                                                                                                            ].elements[
                                                                                                                elementName
                                                                                                            ].prices[
                                                                                                                grupa
                                                                                                            ] =
                                                                                                                parseFloat(
                                                                                                                    e
                                                                                                                        .target
                                                                                                                        .value
                                                                                                                ) ||
                                                                                                                null;
                                                                                                            setData(
                                                                                                                newData
                                                                                                            );
                                                                                                        }}
                                                                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                                    />
                                                                                                </td>
                                                                                            )
                                                                                        )}
                                                                                        <td className="px-3 py-2 text-center">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    if (
                                                                                                        confirm(
                                                                                                            `Usunąć element "${elementName}"?`
                                                                                                        )
                                                                                                    ) {
                                                                                                        const newData =
                                                                                                            JSON.parse(
                                                                                                                JSON.stringify(
                                                                                                                    data
                                                                                                                )
                                                                                                            );
                                                                                                        delete newData.categories[
                                                                                                            category
                                                                                                        ][
                                                                                                            productName
                                                                                                        ].elements[
                                                                                                            elementName
                                                                                                        ];
                                                                                                        setData(
                                                                                                            newData
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                                                                                            >
                                                                                                <Trash2
                                                                                                    size={
                                                                                                        16
                                                                                                    }
                                                                                                />
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                )
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const elementName =
                                                                            prompt(
                                                                                "Nazwa nowego elementu (np. Sofa):"
                                                                            );
                                                                        if (
                                                                            elementName
                                                                        ) {
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
                                                                            ].elements[
                                                                                elementName
                                                                            ] = {
                                                                                quantity: 1,
                                                                                prices: {
                                                                                    grupa1: 0,
                                                                                    grupa2: 0,
                                                                                    grupa3: 0,
                                                                                    grupa4: 0,
                                                                                    grupa5: 0,
                                                                                    grupa6: 0,
                                                                                },
                                                                            };
                                                                            setData(
                                                                                newData
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="mt-2 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-sm"
                                                                >
                                                                    + Dodaj element
                                                                </button>
                                                            </div>
                                                        )}
                                                </div>

                                                {/* Delete Product */}
                                                <div className="bg-gray-50 border-t p-4">
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
                                                        className="w-full px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2"
                                                    >
                                                        <Trash2 size={16} />
                                                        Usuń produkt
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* Add Product */}
                                    <button
                                        onClick={() => {
                                            const productName = prompt(
                                                "Nazwa nowego produktu (np. AMIRA):"
                                            );
                                            if (productName) {
                                                const newData = JSON.parse(
                                                    JSON.stringify(data)
                                                );
                                                newData.categories[category][
                                                    productName
                                                ] = {
                                                    image: "",
                                                    technicalImage: "",
                                                    description: [],
                                                    elements: {
                                                        Sofa: {
                                                            quantity: 1,
                                                            prices: {
                                                                grupa1: 0,
                                                                grupa2: 0,
                                                                grupa3: 0,
                                                                grupa4: 0,
                                                                grupa5: 0,
                                                                grupa6: 0,
                                                            },
                                                        },
                                                    },
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
