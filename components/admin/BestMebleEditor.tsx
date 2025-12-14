"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { BestMebleData, BestMebleProduct } from "@/lib/types";
import { Button, IconButton, ConfirmDialog } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { GlobalSurchargesEditor } from "./GlobalSurchargesEditor";

interface Props {
    data: BestMebleData;
    onChange: (data: BestMebleData) => void;
}

export function BestMebleEditor({ data, onChange }: Props) {
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        index: number;
    }>({ isOpen: false, index: -1 });

    const [newGroupName, setNewGroupName] = useState("");
    const [newDimensionName, setNewDimensionName] = useState("");

    const priceGroups = data.priceGroups || [];
    const dimensionLabels = data.dimensionLabels || [];
    const products = (data.products || []).filter(
        (p): p is BestMebleProduct => p !== null && p !== undefined
    );

    // ============================================
    // GROUP MANAGEMENT
    // ============================================

    const addPriceGroup = () => {
        if (!newGroupName.trim()) return;
        const newGroups = [...priceGroups, newGroupName.trim()];
        onChange({ ...data, priceGroups: newGroups });
        setNewGroupName("");
    };

    const removePriceGroup = (groupName: string) => {
        const newGroups = priceGroups.filter((g) => g !== groupName);
        // Usuń też ceny z produktów
        const newProducts = products.map((p) => {
            const newPrices = { ...p.prices };
            delete newPrices[groupName];
            return { ...p, prices: newPrices };
        });
        onChange({ ...data, priceGroups: newGroups, products: newProducts });
    };

    const renamePriceGroup = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) return;
        const newGroups = priceGroups.map((g) =>
            g === oldName ? newName.trim() : g
        );
        // Zaktualizuj też ceny w produktach
        const newProducts = products.map((p) => {
            const newPrices = { ...p.prices };
            if (newPrices[oldName] !== undefined) {
                newPrices[newName.trim()] = newPrices[oldName];
                delete newPrices[oldName];
            }
            return { ...p, prices: newPrices };
        });
        onChange({ ...data, priceGroups: newGroups, products: newProducts });
    };

    // ============================================
    // DIMENSION MANAGEMENT
    // ============================================

    const addDimensionLabel = () => {
        if (!newDimensionName.trim()) return;
        const newLabels = [...dimensionLabels, newDimensionName.trim()];
        onChange({ ...data, dimensionLabels: newLabels });
        setNewDimensionName("");
    };

    const removeDimensionLabel = (label: string) => {
        const newLabels = dimensionLabels.filter((l) => l !== label);
        // Usuń też wymiary z produktów
        const newProducts = products.map((p) => {
            if (!p.dimensions) return p;
            const newDimensions = { ...p.dimensions };
            delete newDimensions[label];
            return { ...p, dimensions: newDimensions };
        });
        onChange({
            ...data,
            dimensionLabels: newLabels,
            products: newProducts,
        });
    };

    const renameDimensionLabel = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) return;
        const newLabels = dimensionLabels.map((l) =>
            l === oldName ? newName.trim() : l
        );
        // Zaktualizuj też wymiary w produktach
        const newProducts = products.map((p) => {
            if (!p.dimensions) return p;
            const newDimensions = { ...p.dimensions };
            if (newDimensions[oldName] !== undefined) {
                newDimensions[newName.trim()] = newDimensions[oldName];
                delete newDimensions[oldName];
            }
            return { ...p, dimensions: newDimensions };
        });
        onChange({
            ...data,
            dimensionLabels: newLabels,
            products: newProducts,
        });
    };

    // ============================================
    // PRODUCT HANDLERS
    // ============================================

    const updateProduct = (
        index: number,
        field: string,
        value: string | number
    ) => {
        const newProducts = [...products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        onChange({ ...data, products: newProducts });
    };

    const updateProductPrice = (
        index: number,
        group: string,
        value: number
    ) => {
        const newProducts = [...products];
        const newPrices = { ...(newProducts[index].prices || {}) };
        newPrices[group] = value;
        newProducts[index] = { ...newProducts[index], prices: newPrices };
        onChange({ ...data, products: newProducts });
    };

    const updateProductDimension = (
        index: number,
        label: string,
        value: string
    ) => {
        const newProducts = [...products];
        const newDimensions = { ...(newProducts[index].dimensions || {}) };
        newDimensions[label] = value;
        newProducts[index] = {
            ...newProducts[index],
            dimensions: newDimensions,
        };
        onChange({ ...data, products: newProducts });
    };

    const addProduct = () => {
        const newProduct: BestMebleProduct = {
            MODEL: "Nowy model",
            prices: {},
        };
        onChange({ ...data, products: [...products, newProduct] });
    };

    const deleteProduct = (index: number) => {
        setDeleteConfirm({ isOpen: true, index });
    };

    const confirmDeleteProduct = () => {
        const newProducts = [...products];
        newProducts.splice(deleteConfirm.index, 1);
        onChange({ ...data, products: newProducts });
        setDeleteConfirm({ isOpen: false, index: -1 });
    };

    const updateSurcharges = (surcharges: any[]) => {
        onChange({ ...data, surcharges });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Global Surcharges */}
            <GlobalSurchargesEditor
                surcharges={data.surcharges || []}
                onChange={updateSurcharges}
            />

            {/* Price Groups Management */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Grupy cenowe
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                    {priceGroups.map((group) => (
                        <div
                            key={group}
                            className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1"
                        >
                            <Input
                                type="text"
                                value={group}
                                onChange={(e) =>
                                    renamePriceGroup(group, e.target.value)
                                }
                                className="h-6 text-xs w-24 bg-transparent border-none p-0"
                            />
                            <button
                                onClick={() => removePriceGroup(group)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Nazwa nowej grupy"
                        className="h-8 text-sm w-48"
                        onKeyDown={(e) => e.key === "Enter" && addPriceGroup()}
                    />
                    <Button size="sm" onClick={addPriceGroup}>
                        <Plus className="w-4 h-4" />
                        Dodaj grupę
                    </Button>
                </div>
            </div>

            {/* Dimension Labels Management */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Kolumny wymiarów (opcjonalne)
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                    {dimensionLabels.map((label) => (
                        <div
                            key={label}
                            className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1"
                        >
                            <Input
                                type="text"
                                value={label}
                                onChange={(e) =>
                                    renameDimensionLabel(label, e.target.value)
                                }
                                className="h-6 text-xs w-24 bg-transparent border-none p-0"
                            />
                            <button
                                onClick={() => removeDimensionLabel(label)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="text"
                        value={newDimensionName}
                        onChange={(e) => setNewDimensionName(e.target.value)}
                        placeholder="Nazwa kolumny wymiaru"
                        className="h-8 text-sm w-48"
                        onKeyDown={(e) =>
                            e.key === "Enter" && addDimensionLabel()
                        }
                    />
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={addDimensionLabel}
                    >
                        <Plus className="w-4 h-4" />
                        Dodaj wymiar
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Jeśli nie dodasz żadnych kolumn wymiarów, tabela wymiarów
                    nie będzie wyświetlana.
                </p>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                    Model
                                </th>
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                    Poprzednia nazwa
                                </th>
                                {priceGroups.map((g) => (
                                    <th
                                        key={g}
                                        className="px-2 py-2 text-center text-sm font-medium text-gray-700"
                                    >
                                        {g}
                                    </th>
                                ))}
                                {dimensionLabels.map((label) => (
                                    <th
                                        key={label}
                                        className="px-2 py-2 text-center text-sm font-medium text-blue-700 bg-blue-50"
                                    >
                                        {label}
                                    </th>
                                ))}
                                <th className="px-2 py-2 text-center text-sm font-medium text-gray-700">
                                    Rabat %
                                </th>
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                    Opis rabatu
                                </th>
                                <th className="px-2 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                    {/* Model */}
                                    <td className="px-3 py-2">
                                        <Input
                                            type="text"
                                            value={product.MODEL || ""}
                                            onChange={(e) =>
                                                updateProduct(
                                                    index,
                                                    "MODEL",
                                                    e.target.value
                                                )
                                            }
                                            className="h-8 text-sm min-w-[150px]"
                                        />
                                    </td>

                                    {/* Previous Name */}
                                    <td className="px-3 py-2">
                                        <Input
                                            type="text"
                                            value={product.previousName || ""}
                                            onChange={(e) =>
                                                updateProduct(
                                                    index,
                                                    "previousName",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="opcjonalnie"
                                            className="h-8 text-sm min-w-[120px]"
                                        />
                                    </td>

                                    {/* Prices */}
                                    {priceGroups.map((g) => (
                                        <td key={g} className="px-2 py-2">
                                            <Input
                                                type="number"
                                                value={
                                                    product.prices?.[g] || ""
                                                }
                                                onChange={(e) =>
                                                    updateProductPrice(
                                                        index,
                                                        g,
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                placeholder="0"
                                                className="w-20 h-8 text-sm text-center"
                                            />
                                        </td>
                                    ))}

                                    {/* Dimensions */}
                                    {dimensionLabels.map((label) => (
                                        <td
                                            key={label}
                                            className="px-2 py-2 bg-blue-50/50"
                                        >
                                            <Input
                                                type="text"
                                                value={
                                                    product.dimensions?.[
                                                        label
                                                    ] || ""
                                                }
                                                onChange={(e) =>
                                                    updateProductDimension(
                                                        index,
                                                        label,
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="-"
                                                className="w-24 h-8 text-sm text-center"
                                            />
                                        </td>
                                    ))}

                                    {/* Discount */}
                                    <td className="px-2 py-2">
                                        <Input
                                            type="number"
                                            value={product.discount ?? ""}
                                            onChange={(e) =>
                                                updateProduct(
                                                    index,
                                                    "discount",
                                                    e.target.value
                                                        ? parseInt(
                                                              e.target.value
                                                          )
                                                        : ""
                                                )
                                            }
                                            placeholder="%"
                                            className="w-14 h-8 text-sm text-center"
                                        />
                                    </td>

                                    {/* Discount Label */}
                                    <td className="px-3 py-2">
                                        <Input
                                            type="text"
                                            value={product.discountLabel || ""}
                                            onChange={(e) =>
                                                updateProduct(
                                                    index,
                                                    "discountLabel",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="np. stały rabat"
                                            className="h-8 text-sm min-w-[100px]"
                                        />
                                    </td>

                                    {/* Delete */}
                                    <td className="px-2 py-2">
                                        <IconButton
                                            variant="danger"
                                            size="sm"
                                            onClick={() => deleteProduct(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </IconButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {products.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Brak produktów. Dodaj pierwszy produkt.
                    </div>
                )}

                <div className="p-4 border-t border-gray-200">
                    <Button onClick={addProduct}>
                        <Plus className="w-4 h-4" />
                        Dodaj produkt
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, index: -1 })}
                onConfirm={confirmDeleteProduct}
                title="Usunąć produkt?"
                description="Czy na pewno chcesz usunąć ten produkt? Ta operacja jest nieodwracalna."
                confirmText="Usuń"
                cancelText="Anuluj"
                variant="danger"
            />
        </div>
    );
}
