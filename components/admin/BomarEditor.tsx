"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { BomarData, ProducerConfig } from "@/lib/types";
import {
    CollapsibleCard,
    ProductItem,
    Button,
    AddButton,
} from "@/components/ui";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";
import { BomarProductEditor } from "./BomarProductEditor";

interface Props {
    data: BomarData;
    onChange: (data: BomarData) => void;
    producer: ProducerConfig;
}

export function BomarEditor({ data, onChange, producer }: Props) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(
        null
    );
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [addingProductTo, setAddingProductTo] = useState<string | null>(null);

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
        newData.categories[catName][newProductName.trim()] = {
            image: undefined,
            material: "",
            prices: {},
            sizes: [],
            options: [],
            description: [],
        };
        onChange(newData);
        setNewProductName("");
        setAddingProductTo(null);
        setExpandedProduct(`${catName}__${newProductName.trim()}`);
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
            {/* Categories */}
            <div className="space-y-3">
                {Object.entries(data.categories || {}).map(
                    ([catName, products]) => (
                        <CollapsibleCard
                            key={catName}
                            title={
                                <span className="capitalize">{catName}</span>
                            }
                            subtitle={`(${
                                Object.keys(products).length
                            } produktów)`}
                            isExpanded={expandedCategory === catName}
                            onToggle={() =>
                                setExpandedCategory(
                                    expandedCategory === catName
                                        ? null
                                        : catName
                                )
                            }
                            onDelete={() => deleteCategory(catName)}
                        >
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

                            {/* Products */}
                            <div className="space-y-3">
                                {Object.entries(products).map(
                                    ([prodName, prodData]) => (
                                        <ProductItem
                                            key={prodName}
                                            name={prodName}
                                            image={prodData.image}
                                            isExpanded={
                                                expandedProduct ===
                                                `${catName}__${prodName}`
                                            }
                                            onToggle={() =>
                                                setExpandedProduct(
                                                    expandedProduct ===
                                                        `${catName}__${prodName}`
                                                        ? null
                                                        : `${catName}__${prodName}`
                                                )
                                            }
                                            onDelete={() =>
                                                deleteProduct(catName, prodName)
                                            }
                                        >
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
                                            />
                                        </ProductItem>
                                    )
                                )}
                            </div>

                            {/* Add Product */}
                            {addingProductTo === catName ? (
                                <div className="flex gap-2 mt-4">
                                    <input
                                        type="text"
                                        value={newProductName}
                                        onChange={(e) =>
                                            setNewProductName(e.target.value)
                                        }
                                        placeholder="Nazwa produktu"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                                addProduct(catName);
                                            if (e.key === "Escape")
                                                setAddingProductTo(null);
                                        }}
                                    />
                                    <Button onClick={() => addProduct(catName)}>
                                        Dodaj
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setAddingProductTo(null)}
                                    >
                                        Anuluj
                                    </Button>
                                </div>
                            ) : (
                                <AddButton
                                    fullWidth
                                    className="mt-4"
                                    onClick={() => setAddingProductTo(catName)}
                                >
                                    <Plus className="w-4 h-4" />
                                    Dodaj produkt
                                </AddButton>
                            )}
                        </CollapsibleCard>
                    )
                )}
            </div>

            {/* Add Category */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nazwa nowej kategorii"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
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
