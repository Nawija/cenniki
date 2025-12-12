"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import type {
    VerikonData,
    VerikonProductData,
    ProducerConfig,
} from "@/lib/types";
import { Button, AddButton, ConfirmDialog } from "@/components/ui";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";
import { VerikonProductEditor } from "./VerikonProductEditor";

interface Props {
    data: VerikonData;
    onChange: (data: VerikonData) => void;
    producer: ProducerConfig;
}

// Domyślne grupy cenowe Verikon
const VERIKON_PRICE_GROUPS = [
    "G1",
    "G2",
    "G3",
    "G4",
    "Skóra Hermes",
    "Skóra Toledo",
];

export function VerikonEditor({ data, onChange, producer }: Props) {
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [addingProductTo, setAddingProductTo] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        type: "category" | "product";
        catName: string;
        prodName?: string;
    }>({ isOpen: false, type: "category", catName: "" });

    // ============================================
    // HELPER: Get all price groups from a category
    // ============================================

    const getCategoryPriceGroups = (catName: string): string[] => {
        const products = data.categories?.[catName] || {};
        const allGroups = new Set<string>();
        Object.values(products).forEach((prod) => {
            Object.keys(prod.prices || {}).forEach((group) =>
                allGroups.add(group)
            );
        });
        // Jeśli brak grup, użyj domyślnych Verikon
        if (allGroups.size === 0) {
            return VERIKON_PRICE_GROUPS;
        }
        return Array.from(allGroups);
    };

    // ============================================
    // CATEGORY HANDLERS
    // ============================================

    const addCategory = () => {
        if (!newCategoryName.trim()) return;
        const newData = { ...data };
        if (!newData.categories) newData.categories = {};
        newData.categories[newCategoryName.trim()] = {};
        onChange(newData);
        setNewCategoryName("");
    };

    const deleteCategory = (catName: string) => {
        setDeleteConfirm({ isOpen: true, type: "category", catName });
    };

    const confirmDeleteCategory = () => {
        const newData = { ...data };
        delete newData.categories[deleteConfirm.catName];
        onChange(newData);
    };

    // ============================================
    // PRODUCT HANDLERS
    // ============================================

    const addProduct = (catName: string) => {
        if (!newProductName.trim()) return;
        const newData = { ...data };
        // Inicjalizuj z domyślnymi grupami cenowymi Verikon
        const initialPrices: Record<string, number> = {};
        VERIKON_PRICE_GROUPS.forEach((group) => {
            initialPrices[group] = 0;
        });
        newData.categories[catName][newProductName.trim()] = {
            image: undefined,
            material: "4 Star Frosted Black",
            prices: initialPrices,
            sizes: [],
            options: [],
            description: [],
        };
        onChange(newData);
        setNewProductName("");
        setAddingProductTo(null);
    };

    const deleteProduct = (catName: string, prodName: string) => {
        setDeleteConfirm({ isOpen: true, type: "product", catName, prodName });
    };

    const confirmDeleteProduct = () => {
        const newData = { ...data };
        delete newData.categories[deleteConfirm.catName][
            deleteConfirm.prodName!
        ];
        onChange(newData);
    };

    const handleConfirmDelete = () => {
        if (deleteConfirm.type === "category") {
            confirmDeleteCategory();
        } else {
            confirmDeleteProduct();
        }
    };

    const updateProduct = (
        catName: string,
        prodName: string,
        productData: any
    ) => {
        const newData = { ...data };
        newData.categories[catName][prodName] = productData;
        onChange(newData);
    };

    const addPriceGroupToCategory = (catName: string, groupName: string) => {
        const newData = { ...data };
        const products = newData.categories[catName] || {};
        Object.keys(products).forEach((prodName) => {
            if (!products[prodName].prices) {
                products[prodName].prices = {};
            }
            if (!(groupName in products[prodName].prices!)) {
                products[prodName].prices![groupName] = 0;
            }
        });
        onChange(newData);
    };

    const updateCategorySurcharges = (catName: string, surcharges: any[]) => {
        const newData = { ...data };
        if (!newData.categorySettings) newData.categorySettings = {};
        if (!newData.categorySettings[catName])
            newData.categorySettings[catName] = {};
        newData.categorySettings[catName].surcharges = surcharges;
        onChange(newData);
    };

    const updateCategoryPriceFactor = (catName: string, factor: number) => {
        const newData = { ...data };
        if (!newData.categoryPriceFactors) newData.categoryPriceFactors = {};
        newData.categoryPriceFactors[catName] = factor;
        onChange(newData);
    };

    // ============================================
    // RENDER
    // ============================================

    const categoryNames = Object.keys(data.categories || {});

    return (
        <div className="space-y-4">
            {/* Category Price Factors */}
            {categoryNames.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Mnożniki cen dla kategorii
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categoryNames.map((catName) => (
                            <div key={catName} className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 capitalize">
                                    {catName}
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.1"
                                        max="10"
                                        value={
                                            data.categoryPriceFactors?.[
                                                catName
                                            ] ?? 1
                                        }
                                        onChange={(e) =>
                                            updateCategoryPriceFactor(
                                                catName,
                                                parseFloat(e.target.value) || 1
                                            )
                                        }
                                        className="w-20 h-8 text-sm"
                                    />
                                    <span className="text-xs text-gray-400">
                                        (
                                        {Math.round(
                                            ((data.categoryPriceFactors?.[
                                                catName
                                            ] ?? 1) -
                                                1) *
                                                100
                                        )}
                                        %)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Mnożnik 1.0 = bez zmiany, 1.2 = +20%, 0.9 = -10%
                    </p>
                </div>
            )}

            {/* Categories Accordion */}
            <Accordion type="multiple" className="space-y-3">
                {Object.entries(data.categories || {}).map(
                    ([catName, products]) => (
                        <AccordionItem
                            key={catName}
                            value={catName}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                        >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                                <div className="flex items-center justify-between w-full pr-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-gray-900 capitalize">
                                            {catName}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            ({Object.keys(products).length}{" "}
                                            produktów)
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteCategory(catName);
                                        }}
                                        className="text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                {/* Category Surcharges */}
                                <CategorySurchargesEditor
                                    categoryName={catName}
                                    surcharges={
                                        data.categorySettings?.[catName]
                                            ?.surcharges || []
                                    }
                                    onChange={(surcharges) =>
                                        updateCategorySurcharges(
                                            catName,
                                            surcharges
                                        )
                                    }
                                />

                                {/* Products Accordion */}
                                <Accordion
                                    type="multiple"
                                    className="space-y-2 mt-4"
                                >
                                    {Object.entries(products).map(
                                        ([prodName, prodData]) => (
                                            <AccordionItem
                                                key={prodName}
                                                value={`${catName}__${prodName}`}
                                                className="border border-gray-200 rounded-lg overflow-hidden"
                                            >
                                                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                                                    <div className="flex items-center justify-between w-full pr-2">
                                                        <div className="flex items-center gap-3">
                                                            {prodData.image && (
                                                                <Image
                                                                    src={
                                                                        prodData.image
                                                                    }
                                                                    alt=""
                                                                    width={32}
                                                                    height={32}
                                                                    className="w-8 h-8 object-contain rounded"
                                                                />
                                                            )}
                                                            <span className="font-medium text-gray-900">
                                                                {prodName}
                                                            </span>
                                                            {prodData.previousName && (
                                                                <span className="text-xs text-gray-400">
                                                                    (poprzednio:{" "}
                                                                    {
                                                                        prodData.previousName
                                                                    }
                                                                    )
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteProduct(
                                                                    catName,
                                                                    prodName
                                                                );
                                                            }}
                                                            className="text-gray-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-3 pb-3">
                                                    <VerikonProductEditor
                                                        productData={prodData}
                                                        onChange={(
                                                            newData: VerikonProductData
                                                        ) =>
                                                            updateProduct(
                                                                catName,
                                                                prodName,
                                                                newData
                                                            )
                                                        }
                                                        producer={producer}
                                                        allPriceGroups={getCategoryPriceGroups(
                                                            catName
                                                        )}
                                                        onAddPriceGroup={(
                                                            groupName: string
                                                        ) =>
                                                            addPriceGroupToCategory(
                                                                catName,
                                                                groupName
                                                            )
                                                        }
                                                    />
                                                </AccordionContent>
                                            </AccordionItem>
                                        )
                                    )}
                                </Accordion>

                                {/* Add Product */}
                                {addingProductTo === catName ? (
                                    <div className="flex gap-2 mt-4">
                                        <Input
                                            type="text"
                                            value={newProductName}
                                            onChange={(e) =>
                                                setNewProductName(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Nazwa produktu"
                                            className="flex-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    addProduct(catName);
                                                if (e.key === "Escape")
                                                    setAddingProductTo(null);
                                            }}
                                        />
                                        <Button
                                            onClick={() => addProduct(catName)}
                                        >
                                            Dodaj
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setAddingProductTo(null)
                                            }
                                        >
                                            Anuluj
                                        </Button>
                                    </div>
                                ) : (
                                    <AddButton
                                        fullWidth
                                        className="mt-4"
                                        onClick={() =>
                                            setAddingProductTo(catName)
                                        }
                                    >
                                        <Plus className="w-4 h-4" />
                                        Dodaj produkt
                                    </AddButton>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    )
                )}
            </Accordion>

            {/* Add Category */}
            <div className="flex gap-2">
                <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nazwa nowej kategorii"
                    className="flex-1"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") addCategory();
                    }}
                />
                <Button onClick={addCategory}>
                    <Plus className="w-4 h-4" />
                    Dodaj kategorię
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() =>
                    setDeleteConfirm({
                        isOpen: false,
                        type: "category",
                        catName: "",
                    })
                }
                onConfirm={handleConfirmDelete}
                title={
                    deleteConfirm.type === "category"
                        ? "Usunąć kategorię?"
                        : "Usunąć produkt?"
                }
                description={
                    deleteConfirm.type === "category"
                        ? `Czy na pewno chcesz usunąć kategorię "${deleteConfirm.catName}" i wszystkie jej produkty?`
                        : `Czy na pewno chcesz usunąć produkt "${deleteConfirm.prodName}"?`
                }
                confirmText="Usuń"
                cancelText="Anuluj"
                variant="danger"
            />
        </div>
    );
}
