"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import type {
    TopLineData,
    TopLineProductData,
    ProducerConfig,
} from "@/lib/types";
import {
    Button,
    AddButton,
    ImageUploader,
    ConfirmDialog,
} from "@/components/ui";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";

interface Props {
    data: TopLineData;
    onChange: (data: TopLineData) => void;
    producer: ProducerConfig;
}

export function TopLineEditor({ data, onChange, producer }: Props) {
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
        newData.categories[catName][newProductName.trim()] = {
            image: undefined,
            dimensions: "",
            description: "",
            price: 0,
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
                                        size="icon"
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
                                                            size="icon"
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
                                        onClick={() =>
                                            setAddingProductTo(catName)
                                        }
                                        className="mt-4"
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
                <Input
                    type="text"
                    value={productData.previousName || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            previousName: e.target.value || undefined,
                        })
                    }
                    placeholder="opcjonalnie"
                />
            </div>

            {/* Price */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cena brutto (zł)
                </label>
                <Input
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
                />
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
            </div>
        </div>
    );
}
