"use client";

import { Trash2 } from "lucide-react";
import type { BomarProductData, ProducerConfig } from "@/lib/types";
import { ImageUploader, IconButton } from "@/components/ui";

interface Props {
    productData: BomarProductData;
    onChange: (data: BomarProductData) => void;
    producer: Pick<ProducerConfig, "slug">;
}

export function BomarProductEditor({ productData, onChange, producer }: Props) {
    // ============================================
    // PRICE HANDLERS
    // ============================================

    const updatePrice = (group: string, value: string) => {
        const newPrices = { ...productData.prices };
        const numValue = parseInt(value) || 0;
        if (numValue > 0) {
            newPrices[group] = numValue;
        } else {
            delete newPrices[group];
        }
        onChange({ ...productData, prices: newPrices });
    };

    const addPriceGroup = () => {
        const groupName = prompt("Nazwa grupy cenowej (np. Grupa I):");
        if (!groupName) return;
        updatePrice(groupName, "0");
    };

    // ============================================
    // SIZE HANDLERS
    // ============================================

    const updateSize = (index: number, field: string, value: string) => {
        const newSizes = [...(productData.sizes || [])];
        newSizes[index] = { ...newSizes[index], [field]: value };
        onChange({ ...productData, sizes: newSizes });
    };

    const addSize = () => {
        const newSizes = [
            ...(productData.sizes || []),
            { dimension: "", prices: "" },
        ];
        onChange({ ...productData, sizes: newSizes });
    };

    const removeSize = (index: number) => {
        const newSizes = [...(productData.sizes || [])];
        newSizes.splice(index, 1);
        onChange({ ...productData, sizes: newSizes });
    };

    // ============================================
    // OPTIONS HANDLERS
    // ============================================

    const updateOption = (index: number, value: string) => {
        const newOptions = [...(productData.options || [])];
        newOptions[index] = value;
        onChange({ ...productData, options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(productData.options || []), ""];
        onChange({ ...productData, options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = [...(productData.options || [])];
        newOptions.splice(index, 1);
        onChange({ ...productData, options: newOptions });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="p-4 space-y-4 bg-white">
            {/* Image */}
            <ImageUploader
                label="Zdjęcie"
                value={productData.image || null}
                onChange={(path) =>
                    onChange({ ...productData, image: path || undefined })
                }
                producerSlug={producer.slug}
            />

            {/* Material */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materiał
                </label>
                <input
                    type="text"
                    value={productData.material || ""}
                    onChange={(e) =>
                        onChange({ ...productData, material: e.target.value })
                    }
                    placeholder="np. BUK / DĄB"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Previous Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poprzednia nazwa
                </label>
                <input
                    type="text"
                    value={productData.previousName || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            previousName: e.target.value,
                        })
                    }
                    placeholder="opcjonalnie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Product Price Factor */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mnożnik ceny produktu (faktor)
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="10"
                        value={productData.priceFactor ?? 1}
                        onChange={(e) =>
                            onChange({
                                ...productData,
                                priceFactor: parseFloat(e.target.value) || 1,
                            })
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-xs text-gray-500">
                        (1.0 = bez zmiany, mnożony przez główny faktor
                        producenta)
                    </span>
                </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rabat (%)
                    </label>
                    <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={productData.discount ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...productData,
                                discount: e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                            })
                        }
                        placeholder="np. 10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opis rabatu
                    </label>
                    <input
                        type="text"
                        value={productData.discountLabel ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...productData,
                                discountLabel: e.target.value || undefined,
                            })
                        }
                        placeholder="np. stały rabat"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>

            {/* Prices (for chairs) */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Ceny (grupy cenowe)
                    </label>
                    <button
                        onClick={addPriceGroup}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj grupę
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(productData.prices || {}).map(
                        ([group, price]) => (
                            <div
                                key={group}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={group}
                                    disabled
                                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm bg-gray-50"
                                />
                                <input
                                    type="number"
                                    value={price as number}
                                    onChange={(e) =>
                                        updatePrice(group, e.target.value)
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <span className="text-sm text-gray-500">
                                    zł
                                </span>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Sizes (for tables) */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Wymiary i ceny (dla stołów)
                    </label>
                    <button
                        onClick={addSize}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj wymiar
                    </button>
                </div>
                <div className="space-y-2">
                    {(productData.sizes || []).map((size, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={size.dimension}
                                onChange={(e) =>
                                    updateSize(
                                        index,
                                        "dimension",
                                        e.target.value
                                    )
                                }
                                placeholder="np. Ø110x210"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="text"
                                value={size.prices}
                                onChange={(e) =>
                                    updateSize(index, "prices", e.target.value)
                                }
                                placeholder="cena"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-sm text-gray-500">zł</span>
                            <IconButton
                                variant="danger"
                                size="sm"
                                onClick={() => removeSize(index)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </IconButton>
                        </div>
                    ))}
                </div>
            </div>

            {/* Options */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Opcje dodatkowe
                    </label>
                    <button
                        onClick={addOption}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj opcję
                    </button>
                </div>
                <div className="space-y-2">
                    {(productData.options || []).map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                    updateOption(index, e.target.value)
                                }
                                placeholder="np. mechanizm obrotowy +160zł"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <IconButton
                                variant="danger"
                                size="sm"
                                onClick={() => removeOption(index)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </IconButton>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
