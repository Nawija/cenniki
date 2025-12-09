"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type {
    TopLineData,
    TopLineProductData,
    ProducerConfig,
} from "@/lib/types";
import {
    CollapsibleCard,
    ProductItem,
    Button,
    AddButton,
    ImageUploader,
} from "@/components/ui";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";

interface Props {
    data: TopLineData;
    onChange: (data: TopLineData) => void;
    producer: ProducerConfig;
}

export function TopLineEditor({ data, onChange, producer }: Props) {
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
            dimensions: "",
            description: "",
            price: 0,
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
        productData: TopLineProductData
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
                                            <TopLineProductEditor
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
                                    onClick={() => setAddingProductTo(catName)}
                                    className="mt-4"
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

// ============================================
// PRODUCT EDITOR
// ============================================

interface ProductEditorProps {
    productData: TopLineProductData;
    onChange: (data: TopLineProductData) => void;
    producer: Pick<ProducerConfig, "slug">;
}

function TopLineProductEditor({
    productData,
    onChange,
    producer,
}: ProductEditorProps) {
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
                            previousName: e.target.value || undefined,
                        })
                    }
                    placeholder="opcjonalnie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Price */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cena brutto (zł)
                </label>
                <input
                    type="number"
                    value={productData.price || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            price: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                        })
                    }
                    placeholder="np. 1500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
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

            {/* Dimensions (textarea - każda linia = osobny wymiar) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wymiary (każda linia = osobny podpunkt)
                </label>
                <textarea
                    value={productData.dimensions || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            dimensions: e.target.value || undefined,
                        })
                    }
                    placeholder="szerokość: 200cm&#10;głębokość: 90cm&#10;wysokość: 85cm"
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Każda linia będzie wyświetlana jako osobny podpunkt na
                    stronie
                </p>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opis
                </label>
                <textarea
                    value={productData.description || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            description: e.target.value || undefined,
                        })
                    }
                    placeholder="Opis produktu..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>
        </div>
    );
}
