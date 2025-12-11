"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import Image from "next/image";
import type { BomarData, ProducerConfig } from "@/lib/types";
import { Button, AddButton } from "@/components/ui";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";
import { BomarProductEditor } from "./BomarProductEditor";

interface Props {
    data: BomarData;
    onChange: (data: BomarData) => void;
    producer: ProducerConfig;
}

export function BomarEditor({ data, onChange, producer }: Props) {
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [addingProductTo, setAddingProductTo] = useState<string | null>(null);

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
        return Array.from(allGroups).sort();
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
        if (!confirm(`Usunąć kategorię i wszystkie jej produkty?`)) return;
        const newData = { ...data };
        delete newData.categories[catName];
        onChange(newData);
    };

    // ============================================
    // PRODUCT HANDLERS
    // ============================================

    const addProduct = (catName: string) => {
        if (!newProductName.trim()) return;
        const newData = { ...data };
        // Get existing price groups from category and initialize with 0
        const existingGroups = getCategoryPriceGroups(catName);
        const initialPrices: Record<string, number> = {};
        existingGroups.forEach((group) => {
            initialPrices[group] = 0;
        });
        newData.categories[catName][newProductName.trim()] = {
            image: undefined,
            material: "",
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
        if (!confirm(`Usunąć produkt "${prodName}"?`)) return;
        const newData = { ...data };
        delete newData.categories[catName][prodName];
        onChange(newData);
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
        // Add the group to all products in the category
        Object.keys(products).forEach((prodName) => {
            if (!products[prodName].prices) {
                products[prodName].prices = {};
            }
            if (!(groupName in products[prodName].prices)) {
                products[prodName].prices[groupName] = 0;
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

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
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
                                                    <BomarProductEditor
                                                        productData={prodData}
                                                        onChange={(newData) =>
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
                                                            groupName
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
        </div>
    );
}
