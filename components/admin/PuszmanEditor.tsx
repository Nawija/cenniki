"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PuszmanData, PuszmanProduct } from "@/lib/types";
import { Button, IconButton, ConfirmDialog } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { GlobalSurchargesEditor } from "./GlobalSurchargesEditor";

interface Props {
    data: PuszmanData;
    onChange: (data: PuszmanData) => void;
}

const PRICE_GROUPS = [
    "grupa I",
    "grupa II",
    "grupa III",
    "grupa IV",
    "grupa V",
    "grupa VI",
] as const;

export function PuszmanEditor({ data, onChange }: Props) {
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        index: number;
    }>({ isOpen: false, index: -1 });

    const products = (data.Arkusz1 || []).filter(
        (p): p is PuszmanProduct => p !== null && p !== undefined
    );

    // ============================================
    // HANDLERS
    // ============================================

    const updateProduct = (
        index: number,
        field: string,
        value: string | number
    ) => {
        const newProducts = [...products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        onChange({ ...data, Arkusz1: newProducts });
    };

    const addProduct = () => {
        const newProduct: PuszmanProduct = {
            MODEL: "Nowy model",
            "grupa I": 0,
            "grupa II": 0,
            "grupa III": 0,
            "grupa IV": 0,
            "grupa V": 0,
            "grupa VI": 0,
            "KOLOR NOGI": "",
        };
        onChange({ ...data, Arkusz1: [...products, newProduct] });
    };

    const deleteProduct = (index: number) => {
        setDeleteConfirm({ isOpen: true, index });
    };

    const confirmDeleteProduct = () => {
        const newProducts = [...products];
        newProducts.splice(deleteConfirm.index, 1);
        onChange({ ...data, Arkusz1: newProducts });
    };

    const updateSurcharges = (surcharges: any[]) => {
        onChange({ ...data, surcharges });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Global Surcharges */}
            <GlobalSurchargesEditor
                surcharges={data.surcharges || []}
                onChange={updateSurcharges}
            />

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
                                {PRICE_GROUPS.map((g) => (
                                    <th
                                        key={g}
                                        className="px-2 py-2 text-center text-sm font-medium text-gray-700"
                                    >
                                        {g}
                                    </th>
                                ))}
                                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                    Kolor nogi
                                </th>
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
                                            className="h-8 text-sm"
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
                                            className="h-8 text-sm"
                                        />
                                    </td>

                                    {/* Prices */}
                                    {PRICE_GROUPS.map((g) => (
                                        <td key={g} className="px-2 py-2">
                                            <Input
                                                type="number"
                                                value={product[g] || 0}
                                                onChange={(e) =>
                                                    updateProduct(
                                                        index,
                                                        g,
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                className="w-16 h-8 text-sm text-center"
                                            />
                                        </td>
                                    ))}

                                    {/* Leg Color */}
                                    <td className="px-3 py-2">
                                        <Input
                                            type="text"
                                            value={product["KOLOR NOGI"] || ""}
                                            onChange={(e) =>
                                                updateProduct(
                                                    index,
                                                    "KOLOR NOGI",
                                                    e.target.value
                                                )
                                            }
                                            className="h-8 text-sm"
                                        />
                                    </td>

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
                                            className="h-8 text-sm"
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
