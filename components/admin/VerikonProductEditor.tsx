"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { VerikonProductData, ProducerConfig } from "@/lib/types";
import { ImageUploader, IconButton, Button, AddButton } from "@/components/ui";
import { Input } from "@/components/ui/input";

interface Props {
    productData: VerikonProductData;
    onChange: (data: VerikonProductData) => void;
    producer: Pick<ProducerConfig, "slug">;
    allPriceGroups: string[];
    onAddPriceGroup: (groupName: string) => void;
}

export function VerikonProductEditor({
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
        onAddPriceGroup(newGroupName.trim());
        setNewGroupName("");
        setAddingPriceGroup(false);
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

            {/* Material / Base type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materiał / Baza
                </label>
                <Input
                    type="text"
                    value={productData.material || ""}
                    onChange={(e) =>
                        onChange({ ...productData, material: e.target.value })
                    }
                    placeholder="np. 4 Star Frosted Black"
                />
            </div>

            {/* Previous Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poprzednia nazwa (z cennika producenta)
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
                    placeholder="np. Atlantis"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Wpisz oryginalną nazwę z PDF cennika, aby AI mogło dopasować
                    produkty
                </p>
            </div>

            {/* Product Price Factor */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mnożnik ceny produktu
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
                        (1.0 = bez zmiany)
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

            {/* Prices - Verikon material groups */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ceny (grupy materiałowe)
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
                                placeholder="Nazwa grupy (np. G5)"
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
                                placeholder="np. 4 Star Frosted Black"
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
