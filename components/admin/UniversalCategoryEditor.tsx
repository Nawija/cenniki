"use client";

import { useState, useCallback } from "react";
import {
    Plus,
    Trash2,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import type {
    CategoryBasedData,
    UniversalProduct,
    ProducerConfig,
    Surcharge,
    ProductSize,
    PriceElement,
} from "@/lib/types";
import { Button, AddButton, ConfirmDialog, IconButton } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { ImageUploader } from "@/components/ui/image-uploader";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { GlobalSurchargesEditor } from "./GlobalSurchargesEditor";
import { CategorySurchargesEditor } from "./CategorySurchargesEditor";

interface Props {
    data: CategoryBasedData;
    onChange: (data: CategoryBasedData) => void;
    producer: ProducerConfig;
}

// ============================================
// UNIWERSALNY EDYTOR PRODUKTU
// ============================================

interface ProductEditorProps {
    product: UniversalProduct;
    productName: string;
    onChange: (product: UniversalProduct) => void;
    priceGroups: string[];
    showSizes?: boolean;
    showElements?: boolean;
    showPriceMatrix?: boolean;
    showSinglePrice?: boolean;
    producerSlug: string;
}

function UniversalProductEditor({
    product,
    productName,
    onChange,
    priceGroups,
    showSizes = false,
    showElements = false,
    showPriceMatrix = false,
    showSinglePrice = false,
    producerSlug,
}: ProductEditorProps) {
    const [expandedSections, setExpandedSections] = useState<string[]>([
        "prices",
    ]);

    const toggleSection = (section: string) => {
        setExpandedSections((prev) =>
            prev.includes(section)
                ? prev.filter((s) => s !== section)
                : [...prev, section]
        );
    };

    // Aktualizacja pola
    const updateField = (field: string, value: any) => {
        onChange({ ...product, [field]: value });
    };

    // Aktualizacja ceny
    const updatePrice = (group: string, value: number) => {
        const newPrices = { ...product.prices, [group]: value };
        onChange({ ...product, prices: newPrices });
    };

    // Aktualizacja rozmiaru
    const updateSize = (index: number, field: string, value: any) => {
        const newSizes = [...(product.sizes || [])];
        newSizes[index] = { ...newSizes[index], [field]: value };
        onChange({ ...product, sizes: newSizes });
    };

    // Dodanie rozmiaru
    const addSize = () => {
        const newSizes = [
            ...(product.sizes || []),
            { dimension: "", prices: 0 },
        ];
        onChange({ ...product, sizes: newSizes });
    };

    // Usunięcie rozmiaru
    const removeSize = (index: number) => {
        const newSizes = [...(product.sizes || [])];
        newSizes.splice(index, 1);
        onChange({ ...product, sizes: newSizes });
    };

    // Aktualizacja elementu
    const updateElement = (index: number, field: string, value: any) => {
        const newElements = [...(product.elements || [])];
        newElements[index] = { ...newElements[index], [field]: value };
        onChange({ ...product, elements: newElements });
    };

    // Aktualizacja ceny elementu
    const updateElementPrice = (
        elementIndex: number,
        group: string,
        value: number
    ) => {
        const newElements = [...(product.elements || [])];
        newElements[elementIndex] = {
            ...newElements[elementIndex],
            prices: { ...newElements[elementIndex].prices, [group]: value },
        };
        onChange({ ...product, elements: newElements });
    };

    // Dodanie elementu
    const addElement = () => {
        const initialPrices: Record<string, number> = {};
        priceGroups.forEach((g) => (initialPrices[g] = 0));
        const newElements = [
            ...(product.elements || []),
            { name: "Nowy element", prices: initialPrices },
        ];
        onChange({ ...product, elements: newElements });
    };

    // Usunięcie elementu
    const removeElement = (index: number) => {
        const newElements = [...(product.elements || [])];
        newElements.splice(index, 1);
        onChange({ ...product, elements: newElements });
    };

    // Aktualizacja opcji
    const updateOptions = (value: string) => {
        const options = value.split("\n").filter(Boolean);
        onChange({ ...product, options });
    };

    // Aktualizacja opisu
    const updateDescription = (value: string) => {
        if (
            typeof product.description === "string" ||
            !Array.isArray(product.description)
        ) {
            onChange({ ...product, description: value });
        } else {
            onChange({
                ...product,
                description: value.split("\n").filter(Boolean),
            });
        }
    };

    return (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Główne informacje */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Obrazek */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zdjęcie
                    </label>
                    <ImageUploader
                        value={product.image || null}
                        onChange={(url: string | null) =>
                            updateField("image", url || undefined)
                        }
                        producerSlug={producerSlug}
                        folder="products"
                    />
                </div>

                {/* Podstawowe dane */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Poprzednia nazwa
                        </label>
                        <Input
                            value={product.previousName || ""}
                            onChange={(e) =>
                                updateField("previousName", e.target.value)
                            }
                            placeholder="np. stara nazwa"
                            className="h-9"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Materiał
                        </label>
                        <Input
                            value={product.material || ""}
                            onChange={(e) =>
                                updateField("material", e.target.value)
                            }
                            placeholder="np. BUK / DĄB"
                            className="h-9"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Rabat %
                            </label>
                            <Input
                                type="number"
                                value={product.discount ?? ""}
                                onChange={(e) =>
                                    updateField(
                                        "discount",
                                        e.target.value
                                            ? parseInt(e.target.value)
                                            : undefined
                                    )
                                }
                                placeholder="0"
                                className="h-9"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Mnożnik ceny
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                value={product.priceFactor ?? ""}
                                onChange={(e) =>
                                    updateField(
                                        "priceFactor",
                                        e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined
                                    )
                                }
                                placeholder="1.0"
                                className="h-9"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pojedyncza cena (dla TopLine) */}
            {showSinglePrice && (
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cena
                    </label>
                    <Input
                        type="number"
                        value={product.price ?? ""}
                        onChange={(e) =>
                            updateField(
                                "price",
                                e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined
                            )
                        }
                        className="w-32 h-9"
                    />
                </div>
            )}

            {/* Grupy cenowe (dla Bomar, Verikon) */}
            {priceGroups.length > 0 &&
                !showSinglePrice &&
                !showElements &&
                !showSizes && (
                    <div className="border-t pt-4">
                        <div
                            className="flex items-center justify-between cursor-pointer mb-3"
                            onClick={() => toggleSection("prices")}
                        >
                            <label className="text-sm font-medium text-gray-700">
                                Ceny wg grup
                            </label>
                            {expandedSections.includes("prices") ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </div>
                        {expandedSections.includes("prices") && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                {priceGroups.map((group) => (
                                    <div key={group}>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            {group}
                                        </label>
                                        <Input
                                            type="number"
                                            value={product.prices?.[group] ?? 0}
                                            onChange={(e) =>
                                                updatePrice(
                                                    group,
                                                    parseInt(e.target.value) ||
                                                        0
                                                )
                                            }
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            {/* Rozmiary z cenami (dla Bomar stoły) */}
            {showSizes && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                            Rozmiary i ceny
                        </label>
                        <button
                            onClick={addSize}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Dodaj rozmiar
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(product.sizes || []).map((size, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 bg-white p-2 rounded border"
                            >
                                <Input
                                    value={size.dimension}
                                    onChange={(e) =>
                                        updateSize(
                                            idx,
                                            "dimension",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Wymiar (np. Ø110x310)"
                                    className="flex-1 h-8 text-sm"
                                />
                                <Input
                                    type="number"
                                    value={
                                        typeof size.prices === "number"
                                            ? size.prices
                                            : parseInt(size.prices as string) ||
                                              0
                                    }
                                    onChange={(e) =>
                                        updateSize(
                                            idx,
                                            "prices",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Cena"
                                    className="w-24 h-8 text-sm"
                                />
                                <IconButton
                                    onClick={() => removeSize(idx)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </IconButton>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Elementy z cenami (dla Furnirest) */}
            {showElements && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                            Elementy
                        </label>
                        <button
                            onClick={addElement}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Dodaj element
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(product.elements || []).map((element, idx) => (
                            <div
                                key={idx}
                                className="bg-white p-3 rounded border space-y-2"
                            >
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={
                                            element.name || element.code || ""
                                        }
                                        onChange={(e) =>
                                            updateElement(
                                                idx,
                                                element.name !== undefined
                                                    ? "name"
                                                    : "code",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Nazwa elementu"
                                        className="flex-1 h-8 text-sm font-medium"
                                    />
                                    <Input
                                        value={element.dimension || ""}
                                        onChange={(e) =>
                                            updateElement(
                                                idx,
                                                "dimension",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Wymiar"
                                        className="w-32 h-8 text-sm"
                                    />
                                    <IconButton
                                        onClick={() => removeElement(idx)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </IconButton>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {priceGroups.map((group) => (
                                        <div key={group}>
                                            <label className="block text-xs text-gray-400 mb-1">
                                                {group}
                                            </label>
                                            <Input
                                                type="number"
                                                value={
                                                    element.prices?.[group] ?? 0
                                                }
                                                onChange={(e) =>
                                                    updateElementPrice(
                                                        idx,
                                                        group,
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                className="h-7 text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                                {element.note !== undefined && (
                                    <Input
                                        value={element.note || ""}
                                        onChange={(e) =>
                                            updateElement(
                                                idx,
                                                "note",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Notatka"
                                        className="h-8 text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Wymiary (string) */}
            {typeof product.dimensions === "string" && (
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wymiary
                    </label>
                    <textarea
                        value={product.dimensions || ""}
                        onChange={(e) =>
                            updateField("dimensions", e.target.value)
                        }
                        placeholder="Wymiary (każda linia = nowy wymiar)"
                        className="w-full p-2 border rounded-lg text-sm min-h-[80px] resize-y"
                    />
                </div>
            )}

            {/* Opcje */}
            <div className="border-t pt-4">
                <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("options")}
                >
                    <label className="text-sm font-medium text-gray-700">
                        Opcje dodatkowe
                    </label>
                    {expandedSections.includes("options") ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </div>
                {expandedSections.includes("options") && (
                    <textarea
                        value={(product.options || []).join("\n")}
                        onChange={(e) => updateOptions(e.target.value)}
                        placeholder="Każda linia = nowa opcja"
                        className="w-full p-2 border rounded-lg text-sm min-h-[60px] resize-y"
                    />
                )}
            </div>

            {/* Opis */}
            <div className="border-t pt-4">
                <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("description")}
                >
                    <label className="text-sm font-medium text-gray-700">
                        Opis
                    </label>
                    {expandedSections.includes("description") ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </div>
                {expandedSections.includes("description") && (
                    <textarea
                        value={
                            Array.isArray(product.description)
                                ? product.description.join("\n")
                                : product.description || ""
                        }
                        onChange={(e) => updateDescription(e.target.value)}
                        placeholder="Opis produktu"
                        className="w-full p-2 border rounded-lg text-sm min-h-[60px] resize-y"
                    />
                )}
            </div>
        </div>
    );
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export function UniversalCategoryEditor({ data, onChange, producer }: Props) {
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [addingProductTo, setAddingProductTo] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        type: "category" | "product";
        catName: string;
        prodName?: string;
    }>({ isOpen: false, type: "category", catName: "" });

    // Określ typ produktów na podstawie layoutType
    const layoutConfig = getLayoutConfig(producer.layoutType);

    // Pobierz grupy cenowe z kategorii
    const getCategoryPriceGroups = (catName: string): string[] => {
        const products = data.categories?.[catName] || {};
        const allGroups = new Set<string>();

        Object.values(products).forEach((prod) => {
            // Z prices
            Object.keys(prod.prices || {}).forEach((group) =>
                allGroups.add(group)
            );
            // Z elements
            (prod.elements || []).forEach((el: any) => {
                Object.keys(el.prices || {}).forEach((group) =>
                    allGroups.add(group)
                );
            });
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
        const existingGroups = getCategoryPriceGroups(catName);

        // Inicjalizuj produkt wg typu
        const initialProduct: UniversalProduct = {
            image: undefined,
            material: "",
            previousName: "",
        };

        if (layoutConfig.showSizes) {
            initialProduct.sizes = [];
        } else if (layoutConfig.showElements) {
            initialProduct.elements = [];
        } else if (layoutConfig.showSinglePrice) {
            initialProduct.price = 0;
            initialProduct.dimensions = "";
            initialProduct.description = "";
        } else {
            const initialPrices: Record<string, number> = {};
            existingGroups.forEach((group) => (initialPrices[group] = 0));
            initialProduct.prices = initialPrices;
            initialProduct.options = [];
            initialProduct.description = [];
        }

        newData.categories[catName][newProductName.trim()] = initialProduct;
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
        productData: UniversalProduct
    ) => {
        const newData = { ...data };
        newData.categories[catName][prodName] = productData;
        onChange(newData);
    };

    const addPriceGroupToCategory = (catName: string, groupName: string) => {
        const newData = { ...data };
        const products = newData.categories[catName] || {};

        Object.keys(products).forEach((prodName) => {
            if (
                products[prodName].prices &&
                !(groupName in products[prodName].prices)
            ) {
                products[prodName].prices![groupName] = 0;
            }
            // Dla elementów
            if (products[prodName].elements) {
                products[prodName].elements = products[prodName].elements!.map(
                    (el: any) => ({
                        ...el,
                        prices: {
                            ...el.prices,
                            [groupName]: el.prices[groupName] ?? 0,
                        },
                    })
                );
            }
        });

        onChange(newData);
    };

    const updateCategorySurcharges = (
        catName: string,
        surcharges: Surcharge[]
    ) => {
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
            {/* Mnożniki kategorii */}
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
                                        {(
                                            (data.categoryPriceFactors?.[
                                                catName
                                            ] ?? 1) *
                                                100 -
                                            100
                                        ).toFixed(0)}
                                        %)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Kategorie */}
            <Accordion type="multiple" className="space-y-3">
                {categoryNames.map((catName) => {
                    const products = data.categories[catName] || {};
                    const productNames = Object.keys(products);
                    const priceGroups = getCategoryPriceGroups(catName);

                    return (
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
                                            ({productNames.length} produktów)
                                        </span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                {/* Dopłaty kategorii */}
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

                                {/* Grupy cenowe */}
                                {!layoutConfig.showSinglePrice &&
                                    !layoutConfig.showSizes && (
                                        <div className="mt-4 mb-4 p-3 bg-blue-50 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-blue-800">
                                                    Grupy cenowe
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const name = prompt(
                                                            "Nazwa grupy cenowej:"
                                                        );
                                                        if (name)
                                                            addPriceGroupToCategory(
                                                                catName,
                                                                name
                                                            );
                                                    }}
                                                    className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    + Dodaj grupę
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {priceGroups.map((g) => (
                                                    <span
                                                        key={g}
                                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                                                    >
                                                        {g}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                {/* Produkty w kategorii */}
                                <Accordion
                                    type="multiple"
                                    className="space-y-2"
                                >
                                    {productNames
                                        .sort((a, b) =>
                                            a.localeCompare(b, "pl")
                                        )
                                        .map((prodName) => {
                                            const product = products[prodName];
                                            return (
                                                <AccordionItem
                                                    key={prodName}
                                                    value={prodName}
                                                    className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden"
                                                >
                                                    <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-100">
                                                        <div className="flex items-center justify-between w-full pr-2">
                                                            <div className="flex items-center gap-3">
                                                                {product.image && (
                                                                    <div className="w-10 h-10 relative rounded overflow-hidden bg-white">
                                                                        <Image
                                                                            src={
                                                                                product.image
                                                                            }
                                                                            alt={
                                                                                prodName
                                                                            }
                                                                            fill
                                                                            className="object-cover"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <span className="font-medium text-gray-800">
                                                                    {prodName}
                                                                </span>
                                                                {product.previousName && (
                                                                    <span className="text-xs text-gray-400">
                                                                        (dawniej:{" "}
                                                                        {
                                                                            product.previousName
                                                                        }
                                                                        )
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <IconButton
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    deleteProduct(
                                                                        catName,
                                                                        prodName
                                                                    );
                                                                }}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </IconButton>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-3 pb-3">
                                                        <UniversalProductEditor
                                                            product={product}
                                                            productName={
                                                                prodName
                                                            }
                                                            onChange={(
                                                                newProduct
                                                            ) =>
                                                                updateProduct(
                                                                    catName,
                                                                    prodName,
                                                                    newProduct
                                                                )
                                                            }
                                                            priceGroups={
                                                                priceGroups
                                                            }
                                                            showSizes={
                                                                (layoutConfig.showSizes &&
                                                                    (product
                                                                        .sizes
                                                                        ?.length ??
                                                                        0) >
                                                                        0) ||
                                                                catName
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        "stoł"
                                                                    )
                                                            }
                                                            showElements={
                                                                layoutConfig.showElements
                                                            }
                                                            showSinglePrice={
                                                                layoutConfig.showSinglePrice
                                                            }
                                                            producerSlug={
                                                                producer.slug
                                                            }
                                                        />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                </Accordion>

                                {/* Dodaj produkt */}
                                {addingProductTo === catName ? (
                                    <div className="flex items-center gap-2 mt-3">
                                        <Input
                                            value={newProductName}
                                            onChange={(e) =>
                                                setNewProductName(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Nazwa produktu"
                                            className="flex-1"
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                addProduct(catName)
                                            }
                                            autoFocus
                                        />
                                        <Button
                                            onClick={() => addProduct(catName)}
                                            size="sm"
                                        >
                                            Dodaj
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setAddingProductTo(null);
                                                setNewProductName("");
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Anuluj
                                        </Button>
                                    </div>
                                ) : (
                                    <AddButton
                                        onClick={() =>
                                            setAddingProductTo(catName)
                                        }
                                        className="mt-3"
                                    >
                                        Dodaj produkt
                                    </AddButton>
                                )}

                                {/* Usuń kategorię */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => deleteCategory(catName)}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        Usuń kategorię &quot;{catName}&quot;
                                    </button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* Dodaj kategorię */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Dodaj nową kategorię
                </h3>
                <div className="flex items-center gap-2">
                    <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nazwa kategorii"
                        className="flex-1"
                        onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    />
                    <Button onClick={addCategory}>Dodaj kategorię</Button>
                </div>
            </div>

            {/* Dialog potwierdzenia */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() =>
                    setDeleteConfirm({ ...deleteConfirm, isOpen: false })
                }
                onConfirm={handleConfirmDelete}
                title={
                    deleteConfirm.type === "category"
                        ? "Usuń kategorię"
                        : "Usuń produkt"
                }
                description={
                    deleteConfirm.type === "category"
                        ? `Czy na pewno chcesz usunąć kategorię "${deleteConfirm.catName}" wraz ze wszystkimi produktami?`
                        : `Czy na pewno chcesz usunąć produkt "${deleteConfirm.prodName}"?`
                }
            />
        </div>
    );
}

// ============================================
// HELPER - konfiguracja layoutu
// ============================================

function getLayoutConfig(layoutType: string) {
    switch (layoutType) {
        case "topline":
            return {
                showSinglePrice: true,
                showSizes: false,
                showElements: false,
            };
        case "furnirest":
            return {
                showSinglePrice: false,
                showSizes: false,
                showElements: true,
            };
        case "bomar":
        case "halex":
            return {
                showSinglePrice: false,
                showSizes: true,
                showElements: false,
            };
        case "verikon":
        default:
            return {
                showSinglePrice: false,
                showSizes: false,
                showElements: false,
            };
    }
}

export default UniversalCategoryEditor;
