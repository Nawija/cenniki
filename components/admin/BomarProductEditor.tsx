"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BomarProductData, ProducerConfig } from "@/lib/types";
import { ImageUploader, IconButton, Button, AddButton } from "@/components/ui";
import { Input } from "@/components/ui/input";

interface Props {
    productData: BomarProductData;
    onChange: (data: BomarProductData) => void;
    producer: Pick<ProducerConfig, "slug">;
    allPriceGroups: string[];
    onAddPriceGroup: (groupName: string) => void;
}

export function BomarProductEditor({
    productData,
    onChange,
    producer,
    allPriceGroups,
    onAddPriceGroup,
}: Props) {
    const [addingPriceGroup, setAddingPriceGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    // ============================================
    // PRICE HANDLERS
    // ============================================

    const updatePrice = (group: string, value: string) => {
        const newPrices = { ...productData.prices };
        const numValue = parseInt(value) || 0;
        newPrices[group] = numValue;
        onChange({ ...productData, prices: newPrices });
    };

    const addPriceGroup = () => {
        if (!newGroupName.trim()) return;
        // Add to all products in category via parent callback
        onAddPriceGroup(newGroupName.trim());
        setNewGroupName("");
        setAddingPriceGroup(false);
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
                <Input
                    type="text"
                    value={productData.material || ""}
                    onChange={(e) =>
                        onChange({ ...productData, material: e.target.value })
                    }
                    placeholder="np. BUK / DĄB"
                />
            </div>

            {/* Previous Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poprzednia nazwa
                </label>
                <Input
                    type="text"
                    value={productData.previousName || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            previousName: e.target.value,
                        })
                    }
                    placeholder="opcjonalnie"
                />
            </div>

            {/* Product Price Factor */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mnożnik ceny produktu (faktor)
                </label>
                <div className="flex items-center gap-2">
                    <Input
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
                        className="w-24"
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
                    <Input
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
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opis rabatu
                    </label>
                    <Input
                        type="text"
                        value={productData.discountLabel ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...productData,
                                discountLabel: e.target.value || undefined,
                            })
                        }
                        placeholder="np. stały rabat"
                    />
                </div>
            </div>

            {/* Prices (for chairs) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ceny (grupy cenowe)
                </label>
                <div className="space-y-2">
                    {allPriceGroups.map((group) => (
                        <div key={group} className="flex items-center gap-2">
                            <Input
                                type="text"
                                value={group}
                                disabled
                                className="flex-1 bg-gray-50"
                            />
                            <Input
                                type="number"
                                value={productData.prices?.[group] ?? 0}
                                onChange={(e) =>
                                    updatePrice(group, e.target.value)
                                }
                                className="w-24"
                            />
                            <span className="text-sm text-gray-500">zł</span>
                        </div>
                    ))}

                    {/* Add price group form */}
                    {addingPriceGroup ? (
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                value={newGroupName}
                                onChange={(e) =>
                                    setNewGroupName(e.target.value)
                                }
                                placeholder="Nazwa grupy (np. Grupa I)"
                                className="flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") addPriceGroup();
                                    if (e.key === "Escape") {
                                        setAddingPriceGroup(false);
                                        setNewGroupName("");
                                    }
                                }}
                            />
                            <Button size="sm" onClick={addPriceGroup}>
                                Dodaj
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setAddingPriceGroup(false);
                                    setNewGroupName("");
                                }}
                            >
                                Anuluj
                            </Button>
                        </div>
                    ) : (
                        <AddButton
                            onClick={() => setAddingPriceGroup(true)}
                            className="w-full"
                        >
                            <Plus className="w-4 h-4" />
                            Dodaj grupę cenową
                        </AddButton>
                    )}
                </div>
            </div>

            {/* Sizes (for tables) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wymiary i ceny (dla stołów)
                </label>
                <div className="space-y-2">
                    {(productData.sizes || []).map((size, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
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
                                className="flex-1"
                            />
                            <Input
                                type="text"
                                value={size.prices}
                                onChange={(e) =>
                                    updateSize(index, "prices", e.target.value)
                                }
                                placeholder="cena"
                                className="w-24"
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
                    <AddButton onClick={addSize} className="w-full">
                        <Plus className="w-4 h-4" />
                        Dodaj wymiar
                    </AddButton>
                </div>
            </div>

            {/* Options */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opcje dodatkowe
                </label>
                <div className="space-y-2">
                    {(productData.options || []).map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                    updateOption(index, e.target.value)
                                }
                                placeholder="np. mechanizm obrotowy +160zł"
                                className="flex-1"
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
                    <AddButton onClick={addOption} className="w-full">
                        <Plus className="w-4 h-4" />
                        Dodaj opcję
                    </AddButton>
                </div>
            </div>
        </div>
    );
}
