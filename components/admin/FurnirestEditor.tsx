"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import type {
    FurnirestData,
    FurnirestProductData,
    FurnirestPriceMatrix,
    FurnirestElement,
    ProducerConfig,
} from "@/lib/types";
import { Button, AddButton, ConfirmDialog } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";
import { useImageUpload } from "@/hooks";

interface Props {
    data: FurnirestData;
    onChange: (data: FurnirestData) => void;
    producer: ProducerConfig;
}

type CategoryType = "groups" | "elements";

export function FurnirestEditor({ data, onChange, producer }: Props) {
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryType, setNewCategoryType] =
        useState<CategoryType>("groups");
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
        if (!newData.categorySettings) newData.categorySettings = {};

        newData.categories[newCategoryName.trim()] = {};
        newData.categorySettings[newCategoryName.trim()] = {
            type: newCategoryType,
        };

        onChange(newData);
        setNewCategoryName("");
    };

    const getCategoryType = (catName: string): CategoryType => {
        return data.categorySettings?.[catName]?.type || "groups";
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

    const getCategoryVariants = (catName: string): string[] => {
        return data.categorySettings?.[catName]?.variants || [];
    };

    const addProduct = (catName: string) => {
        if (!newProductName.trim()) return;
        const newData = { ...data };
        const categoryType = getCategoryType(catName);

        if (categoryType === "elements") {
            // Dla trybu "elements" - proste elementy tekstowe
            // Warianty są wspólne dla kategorii - weź je z categorySettings
            newData.categories[catName][newProductName.trim()] = {
                elements: [],
                options: [],
                description: [],
            };
        } else {
            // Dla trybu "groups" - macierz cen
            // Get existing groups and columns from other products in category
            const existingProducts = Object.values(
                newData.categories[catName] || {}
            );
            let defaultGroups: string[] = [];
            let defaultColumns: string[] = [];

            if (
                existingProducts.length > 0 &&
                existingProducts[0].priceMatrix
            ) {
                defaultGroups = [...existingProducts[0].priceMatrix.groups];
                defaultColumns = [...existingProducts[0].priceMatrix.columns];
            }

            // Initialize values with 0
            const values: Record<string, Record<string, number>> = {};
            defaultGroups.forEach((group) => {
                values[group] = {};
                defaultColumns.forEach((col) => {
                    values[group][col] = 0;
                });
            });

            newData.categories[catName][newProductName.trim()] = {
                priceMatrix: {
                    groups: defaultGroups,
                    columns: defaultColumns,
                    values,
                },
                options: [],
                description: [],
            };
        }

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
        productData: FurnirestProductData
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

    const updateCategoryVariants = (catName: string, variants: string[]) => {
        const newData = { ...data };
        if (!newData.categorySettings) newData.categorySettings = {};
        if (!newData.categorySettings[catName])
            newData.categorySettings[catName] = {};
        newData.categorySettings[catName].variants = variants;

        // Synchronize variants with all products in category
        const products = newData.categories[catName] || {};
        Object.keys(products).forEach((prodName) => {
            const product = products[prodName];
            if (product.elements) {
                product.elements = product.elements.map((el) => {
                    const newPrices: Record<string, number> = {};
                    variants.forEach((v) => {
                        newPrices[v] = el.prices?.[v] || 0;
                    });
                    return { ...el, prices: newPrices };
                });
            }
        });

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
                                        <Badge
                                            variant={
                                                getCategoryType(catName) ===
                                                "groups"
                                                    ? "default"
                                                    : "secondary"
                                            }
                                            className="text-xs"
                                        >
                                            {getCategoryType(catName) ===
                                            "groups"
                                                ? "Grupy"
                                                : "Elementy"}
                                        </Badge>
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
                                                            {getCategoryType(
                                                                catName
                                                            ) === "groups" &&
                                                                (prodData
                                                                    .priceMatrix
                                                                    ?.groups
                                                                    ?.length ??
                                                                    0) > 0 && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs"
                                                                    >
                                                                        {prodData
                                                                            .priceMatrix
                                                                            ?.groups
                                                                            ?.length ||
                                                                            0}{" "}
                                                                        grup ×{" "}
                                                                        {prodData
                                                                            .priceMatrix
                                                                            ?.columns
                                                                            ?.length ||
                                                                            0}{" "}
                                                                        wariantów
                                                                    </Badge>
                                                                )}
                                                            {getCategoryType(
                                                                catName
                                                            ) === "elements" &&
                                                                (prodData
                                                                    .elements
                                                                    ?.length ??
                                                                    0) > 0 && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs"
                                                                    >
                                                                        {prodData
                                                                            .elements
                                                                            ?.length ||
                                                                            0}{" "}
                                                                        elementów
                                                                    </Badge>
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
                                                    <FurnirestProductEditor
                                                        productData={prodData}
                                                        onChange={(newData) =>
                                                            updateProduct(
                                                                catName,
                                                                prodName,
                                                                newData
                                                            )
                                                        }
                                                        producer={producer}
                                                        categoryType={getCategoryType(
                                                            catName
                                                        )}
                                                        categoryVariants={getCategoryVariants(
                                                            catName
                                                        )}
                                                        onCategoryVariantsChange={(
                                                            variants
                                                        ) =>
                                                            updateCategoryVariants(
                                                                catName,
                                                                variants
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
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                    Dodaj kategorię
                </h3>
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
                    <select
                        value={newCategoryType}
                        onChange={(e) =>
                            setNewCategoryType(e.target.value as CategoryType)
                        }
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="groups">Grupy (macierz cen)</option>
                        <option value="elements">Elementy (proste)</option>
                    </select>
                    <Button onClick={addCategory}>
                        <Plus className="w-4 h-4" />
                        Dodaj
                    </Button>
                </div>
                <p className="text-xs text-gray-400">
                    <strong>Grupy:</strong> wspólna macierz cen dla wszystkich
                    produktów w kategorii.
                    <strong className="ml-2">Elementy:</strong> każdy produkt ma
                    własne elementy z cenami.
                </p>
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
// PRODUCT EDITOR WITH PRICE MATRIX OR ELEMENTS
// ============================================

interface ProductEditorProps {
    productData: FurnirestProductData;
    onChange: (data: FurnirestProductData) => void;
    producer: ProducerConfig;
    categoryType: CategoryType;
    categoryVariants?: string[];
    onCategoryVariantsChange?: (variants: string[]) => void;
}

function FurnirestProductEditor({
    productData,
    onChange,
    producer,
    categoryType,
    categoryVariants = [],
    onCategoryVariantsChange,
}: ProductEditorProps) {
    const [newGroup, setNewGroup] = useState("");
    const [newColumn, setNewColumn] = useState("");
    const [newElementName, setNewElementName] = useState("");
    const [newVariant, setNewVariant] = useState("");

    const { uploading, upload } = useImageUpload({
        producerSlug: producer.slug,
        folder: "products",
        onSuccess: (url) => {
            onChange({ ...productData, image: url });
        },
    });

    const matrix = productData.priceMatrix || {
        groups: [],
        columns: [],
        values: {},
        dimensions: {},
    };
    const dimensions = matrix.dimensions || {};
    const elements = productData.elements || [];

    // Use category variants for elements mode
    const variants = categoryVariants;

    // ============================================
    // MATRIX HANDLERS (for "groups" mode)
    // ============================================

    const addGroup = () => {
        if (!newGroup.trim()) return;
        const groupName = newGroup.trim();

        const newMatrix: FurnirestPriceMatrix = {
            ...matrix,
            groups: [...matrix.groups, groupName],
            values: {
                ...matrix.values,
                [groupName]: matrix.columns.reduce((acc, col) => {
                    acc[col] = 0;
                    return acc;
                }, {} as Record<string, number>),
            },
            dimensions: {
                ...dimensions,
                [groupName]: "",
            },
        };

        onChange({ ...productData, priceMatrix: newMatrix });
        setNewGroup("");
    };

    const removeGroup = (groupName: string) => {
        const newGroups = matrix.groups.filter((g) => g !== groupName);
        const newValues = { ...matrix.values };
        delete newValues[groupName];
        const newDimensions = { ...dimensions };
        delete newDimensions[groupName];

        onChange({
            ...productData,
            priceMatrix: {
                ...matrix,
                groups: newGroups,
                values: newValues,
                dimensions: newDimensions,
            },
        });
    };

    const addColumn = () => {
        if (!newColumn.trim()) return;
        const colName = newColumn.trim();

        const newValues = { ...matrix.values };
        matrix.groups.forEach((group) => {
            if (!newValues[group]) newValues[group] = {};
            newValues[group][colName] = 0;
        });

        onChange({
            ...productData,
            priceMatrix: {
                ...matrix,
                columns: [...matrix.columns, colName],
                values: newValues,
            },
        });
        setNewColumn("");
    };

    const removeColumn = (colName: string) => {
        const newColumns = matrix.columns.filter((c) => c !== colName);
        const newValues = { ...matrix.values };

        matrix.groups.forEach((group) => {
            if (newValues[group]) {
                delete newValues[group][colName];
            }
        });

        onChange({
            ...productData,
            priceMatrix: { ...matrix, columns: newColumns, values: newValues },
        });
    };

    const updatePrice = (group: string, column: string, value: number) => {
        const newValues = { ...matrix.values };
        if (!newValues[group]) newValues[group] = {};
        newValues[group][column] = value;

        onChange({
            ...productData,
            priceMatrix: { ...matrix, values: newValues },
        });
    };

    const updateDimension = (group: string, value: string) => {
        const newDimensions = { ...dimensions, [group]: value };
        onChange({
            ...productData,
            priceMatrix: { ...matrix, dimensions: newDimensions },
        });
    };

    // ============================================
    // ELEMENT HANDLERS (for "elements" mode)
    // ============================================

    const addElement = () => {
        if (!newElementName.trim()) return;
        // Initialize prices for all existing variants
        const initialPrices: Record<string, number> = {};
        variants.forEach((v) => {
            initialPrices[v] = 0;
        });
        const newElements: FurnirestElement[] = [
            ...elements,
            { name: newElementName.trim(), prices: initialPrices },
        ];
        onChange({ ...productData, elements: newElements });
        setNewElementName("");
    };

    const removeElement = (index: number) => {
        const newElements = elements.filter((_, i) => i !== index);
        onChange({ ...productData, elements: newElements });
    };

    const updateElement = (
        index: number,
        field: "name" | "dimension" | "note",
        value: string
    ) => {
        const newElements = [...elements];
        newElements[index] = { ...newElements[index], [field]: value };
        onChange({ ...productData, elements: newElements });
    };

    const updateElementPrice = (index: number, variant: string, price: number) => {
        const newElements = [...elements];
        const newPrices = { ...newElements[index].prices, [variant]: price };
        newElements[index] = { ...newElements[index], prices: newPrices };
        onChange({ ...productData, elements: newElements });
    };

    const addVariant = () => {
        if (!newVariant.trim() || !onCategoryVariantsChange) return;
        const variantName = newVariant.trim();
        if (variants.includes(variantName)) return; // Already exists
        // Add variant to category (this will sync to all products)
        onCategoryVariantsChange([...variants, variantName]);
        setNewVariant("");
    };

    const removeVariant = (variantName: string) => {
        if (!onCategoryVariantsChange) return;
        // Remove variant from category (this will sync to all products)
        onCategoryVariantsChange(variants.filter((v) => v !== variantName));
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Image Upload */}
            <div className="flex items-start gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {productData.image ? (
                        <Image
                            src={productData.image}
                            alt=""
                            width={96}
                            height={96}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <span className="text-xs text-gray-400">
                            Brak zdjęcia
                        </span>
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <Label className="text-xs text-gray-500">
                        Zdjęcie produktu
                    </Label>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) upload(file);
                        }}
                        disabled={uploading}
                        className="text-sm"
                    />
                    {uploading && (
                        <p className="text-xs text-blue-600">Przesyłanie...</p>
                    )}
                </div>
            </div>

            {/* Previous Name + Discount */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-xs text-gray-500">
                        Poprzednia nazwa
                    </Label>
                    <Input
                        type="text"
                        value={productData.previousName || ""}
                        onChange={(e) =>
                            onChange({
                                ...productData,
                                previousName: e.target.value,
                            })
                        }
                        placeholder="np. stara nazwa"
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label className="text-xs text-gray-500">Rabat (%)</Label>
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        value={productData.discount || ""}
                        onChange={(e) =>
                            onChange({
                                ...productData,
                                discount:
                                    parseFloat(e.target.value) || undefined,
                            })
                        }
                        placeholder="np. 10"
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Price Matrix Editor (for "groups" mode) */}
            {categoryType === "groups" && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                        Macierz cen
                    </h4>

                    {/* Add Group */}
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={newGroup}
                            onChange={(e) => setNewGroup(e.target.value)}
                            placeholder="Nowa grupa cenowa (np. TK GRUPA 1)"
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addGroup()}
                        />
                        <Button size="sm" onClick={addGroup}>
                            <Plus className="w-4 h-4" />
                            Grupa
                        </Button>
                    </div>

                    {/* Add Column */}
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={newColumn}
                            onChange={(e) => setNewColumn(e.target.value)}
                            placeholder="Nowy wariant/wymiar (np. 80x120)"
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addColumn()}
                        />
                        <Button size="sm" onClick={addColumn}>
                            <Plus className="w-4 h-4" />
                            Wariant
                        </Button>
                    </div>

                    {/* Matrix Table */}
                    {matrix.groups.length > 0 && matrix.columns.length > 0 && (
                        <ScrollArea className="w-full border rounded-lg">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left p-2 font-medium text-gray-600 border-b sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                                            Grupa
                                        </th>
                                        <th className="text-center p-2 font-medium text-gray-600 border-b min-w-[120px]">
                                            Wymiar
                                        </th>
                                        {matrix.columns.map((col) => (
                                            <th
                                                key={col}
                                                className="p-2 border-b min-w-[120px]"
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-medium text-gray-600 truncate">
                                                        {col}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            removeColumn(col)
                                                        }
                                                        className="text-gray-400 hover:text-red-500 p-0.5"
                                                        title="Usuń wariant"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrix.groups.map((group) => (
                                        <tr
                                            key={group}
                                            className="border-b last:border-b-0"
                                        >
                                            <td className="p-2 sticky left-0 bg-white z-10">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-medium text-gray-700 truncate">
                                                        {group}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            removeGroup(group)
                                                        }
                                                        className="text-gray-400 hover:text-red-500 p-0.5"
                                                        title="Usuń grupę"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="text"
                                                    value={
                                                        dimensions[group] || ""
                                                    }
                                                    onChange={(e) =>
                                                        updateDimension(
                                                            group,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 text-center text-sm"
                                                    placeholder="np. 80x120 cm"
                                                />
                                            </td>
                                            {matrix.columns.map((col) => (
                                                <td key={col} className="p-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            matrix.values[
                                                                group
                                                            ]?.[col] || ""
                                                        }
                                                        onChange={(e) =>
                                                            updatePrice(
                                                                group,
                                                                col,
                                                                parseFloat(
                                                                    e.target
                                                                        .value
                                                                ) || 0
                                                            )
                                                        }
                                                        className="h-8 text-center text-sm"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    )}

                    {matrix.groups.length === 0 &&
                        matrix.columns.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">
                                Dodaj grupy cenowe i warianty, aby stworzyć
                                macierz cen
                            </p>
                        )}
                </div>
            )}

            {/* Elements Editor (for "elements" mode) */}
            {categoryType === "elements" && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                        Elementy produktu
                    </h4>

                    {/* Add Variant */}
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={newVariant}
                            onChange={(e) => setNewVariant(e.target.value)}
                            placeholder="Nowy wariant (np. BUK, Dąb)"
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addVariant()}
                        />
                        <Button size="sm" onClick={addVariant}>
                            <Plus className="w-4 h-4" />
                            Dodaj wariant
                        </Button>
                    </div>

                    {/* Add Element */}
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={newElementName}
                            onChange={(e) => setNewElementName(e.target.value)}
                            placeholder="Nazwa elementu (np. Stół 1)"
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && addElement()}
                        />
                        <Button size="sm" onClick={addElement}>
                            <Plus className="w-4 h-4" />
                            Dodaj element
                        </Button>
                    </div>

                    {/* Elements Table with Variants */}
                    {elements.length > 0 && (
                        <ScrollArea className="w-full border rounded-lg">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left p-2 font-medium text-gray-600 border-b sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                                            Element
                                        </th>
                                        <th className="text-center p-2 font-medium text-gray-600 border-b min-w-[100px]">
                                            Wymiar
                                        </th>
                                        {variants.map((variant) => (
                                            <th
                                                key={variant}
                                                className="p-2 border-b min-w-[100px]"
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-medium text-gray-600 truncate">
                                                        {variant}
                                                    </span>
                                                    <button
                                                        onClick={() => removeVariant(variant)}
                                                        className="text-gray-400 hover:text-red-500 p-0.5"
                                                        title="Usuń wariant"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-2 border-b w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elements.map((el, idx) => (
                                        <>
                                            <tr
                                                key={idx}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="p-1 sticky left-0 bg-white z-10">
                                                    <Input
                                                        type="text"
                                                        value={el.name}
                                                        onChange={(e) =>
                                                            updateElement(idx, "name", e.target.value)
                                                        }
                                                        className="h-8 text-sm"
                                                        placeholder="Nazwa elementu"
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <Input
                                                        type="text"
                                                        value={el.dimension || ""}
                                                        onChange={(e) =>
                                                            updateElement(idx, "dimension", e.target.value)
                                                        }
                                                        className="h-8 text-center text-sm"
                                                        placeholder="np. 80x40"
                                                    />
                                                </td>
                                                {variants.map((variant) => (
                                                    <td key={variant} className="p-1">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={el.prices?.[variant] || ""}
                                                            onChange={(e) =>
                                                                updateElementPrice(
                                                                    idx,
                                                                    variant,
                                                                    parseFloat(e.target.value) || 0
                                                                )
                                                            }
                                                            className="h-8 text-center text-sm"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-1">
                                                    <button
                                                        onClick={() => removeElement(idx)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                        title="Usuń element"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Note row for each element */}
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={variants.length + 3} className="px-2 pb-2">
                                                    <Input
                                                        type="text"
                                                        value={el.note || ""}
                                                        onChange={(e) =>
                                                            updateElement(idx, "note", e.target.value)
                                                        }
                                                        className="h-7 text-xs text-gray-600"
                                                        placeholder="Notatka do elementu (np. rozkładany 4 wkładkami)"
                                                    />
                                                </td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>
                            </table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    )}

                    {elements.length === 0 && variants.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                            Dodaj warianty (np. BUK, Dąb) i elementy produktu
                        </p>
                    )}
                </div>
            )}

            {/* Notes */}
            <div>
                <Label className="text-xs text-gray-500">Notatki</Label>
                <Input
                    type="text"
                    value={productData.notes || ""}
                    onChange={(e) =>
                        onChange({ ...productData, notes: e.target.value })
                    }
                    placeholder="Dodatkowe uwagi..."
                    className="mt-1"
                />
            </div>
        </div>
    );
}
