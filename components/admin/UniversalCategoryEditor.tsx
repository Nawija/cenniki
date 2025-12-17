"use client";

import { useState, useCallback } from "react";
import {
    Trash2,
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
    sizeVariants: string[];
    groupsVariants: string[];
    showSizes?: boolean;
    showElements?: boolean;
    showPriceMatrix?: boolean;
    showSinglePrice?: boolean;
    producerSlug: string;
    onAddSizeVariant?: (variant: string) => void;
    onAddProductVariant?: (variant: string) => void;
    onAddGroupsVariant?: (variant: string) => void;
}

function UniversalProductEditor({
    product,
    productName,
    onChange,
    priceGroups,
    sizeVariants,
    groupsVariants,
    showSizes = false,
    showElements = false,
    showSinglePrice = false,
    producerSlug,
    onAddSizeVariant,
    onAddProductVariant,
    onAddGroupsVariant,
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

    // Pobierz warianty specyficzne dla produktu (z sizes)
    const getProductVariants = (): string[] => {
        if (!product.sizes || product.sizes.length === 0) return [];
        const productVariants = new Set<string>();
        product.sizes.forEach((size: any) => {
            if (typeof size.prices === "object" && size.prices !== null) {
                Object.keys(size.prices).forEach((v) => productVariants.add(v));
            }
        });
        return Array.from(productVariants);
    };

    // Pobierz warianty specyficzne dla produktu (z prices - grupy cenowe)
    const getProductGroupsVariants = (): string[] => {
        if (!product.prices) return [];
        const productVariants = new Set<string>();
        Object.values(product.prices).forEach((price: any) => {
            if (
                typeof price === "object" &&
                price !== null &&
                !Array.isArray(price)
            ) {
                Object.keys(price).forEach((v) => productVariants.add(v));
            }
        });
        return Array.from(productVariants);
    };

    // Sprawdź czy produkt ma własne warianty dla grup cenowych
    const productGroupsVariants = getProductGroupsVariants();
    const hasCustomGroupsVariants =
        productGroupsVariants.length > 0 &&
        !productGroupsVariants.every((v) => groupsVariants.includes(v));
    const effectiveGroupsVariants = hasCustomGroupsVariants
        ? productGroupsVariants
        : groupsVariants;

    // Usuń wariant z produktu (dla grup cenowych)
    const removeGroupsVariantFromProduct = (variantToRemove: string) => {
        if (!product.prices) return;

        const remainingVariants = productGroupsVariants.filter(
            (v) => v !== variantToRemove
        );

        const newPrices: Record<string, any> = {};

        Object.entries(product.prices).forEach(([group, price]) => {
            if (
                typeof price === "object" &&
                price !== null &&
                !Array.isArray(price)
            ) {
                if (remainingVariants.length === 0) {
                    // Jeśli nie ma wariantów, ustaw na 0
                    newPrices[group] = 0;
                } else {
                    const newGroupPrice = {
                        ...(price as Record<string, number>),
                    };
                    delete newGroupPrice[variantToRemove];
                    newPrices[group] = newGroupPrice;
                }
            } else {
                newPrices[group] = price;
            }
        });

        onChange({ ...product, prices: newPrices });
    };

    // Dodaj własny wariant tylko do tego produktu (dla grup cenowych)
    const addGroupsVariantToProduct = (variantName: string) => {
        if (!product.prices) return;

        const newPrices: Record<string, any> = {};
        const currentVariants =
            productGroupsVariants.length > 0
                ? productGroupsVariants
                : groupsVariants;

        Object.entries(product.prices).forEach(([group, price]) => {
            if (
                typeof price === "object" &&
                price !== null &&
                !Array.isArray(price)
            ) {
                // Już ma warianty - dodaj nowy
                newPrices[group] = {
                    ...(price as Record<string, number>),
                    [variantName]: 0,
                };
            } else {
                // Pojedyncza wartość - konwertuj na obiekt z wariantami
                const oldPrice = typeof price === "number" ? price : 0;
                const allVariants = [...currentVariants, variantName];
                newPrices[group] = Object.fromEntries(
                    allVariants.map((v) => [
                        v,
                        v === variantName ? 0 : oldPrice,
                    ])
                );
            }
        });

        onChange({ ...product, prices: newPrices });
    };

    // Resetuj do wariantów kategorii (dla grup cenowych)
    const resetToGroupsCategoryVariants = () => {
        if (!product.prices) return;

        const newPrices: Record<string, any> = {};

        Object.entries(product.prices).forEach(([group, price]) => {
            if (groupsVariants.length > 0) {
                // Ustaw warianty kategorii
                newPrices[group] = Object.fromEntries(
                    groupsVariants.map((v) => [v, 0])
                );
            } else {
                // Brak wariantów - pojedyncza wartość
                newPrices[group] = 0;
            }
        });

        onChange({ ...product, prices: newPrices });
    };

    // Użyj wariantów produktu jeśli są inne niż kategoriowe
    const productVariants = getProductVariants();
    const hasCustomVariants =
        productVariants.length > 0 &&
        !productVariants.every((v) => sizeVariants.includes(v));
    const effectiveVariants = hasCustomVariants
        ? productVariants
        : sizeVariants;

    // Usuń wariant z produktu (przywróć warianty kategorii)
    const removeProductVariant = (variantToRemove: string) => {
        if (!product.sizes) return;

        const remainingVariants = productVariants.filter(
            (v) => v !== variantToRemove
        );

        // Jeśli zostanie 0 wariantów produktu, przełącz na warianty kategorii
        if (remainingVariants.length === 0) {
            // Ustaw warianty kategorii z cenami 0
            const newSizes = product.sizes.map((size: any) => ({
                ...size,
                prices: Object.fromEntries(sizeVariants.map((v) => [v, 0])),
            }));
            onChange({ ...product, sizes: newSizes });
        } else {
            // Usuń tylko ten wariant z każdego rozmiaru
            const newSizes = product.sizes.map((size: any) => {
                if (typeof size.prices === "object" && size.prices !== null) {
                    const newPrices = { ...size.prices };
                    delete newPrices[variantToRemove];
                    return { ...size, prices: newPrices };
                }
                return size;
            });
            onChange({ ...product, sizes: newSizes });
        }
    };

    // Resetuj do wariantów kategorii
    const resetToCategoryVariants = () => {
        if (!product.sizes) return;
        const newSizes = product.sizes.map((size: any) => ({
            ...size,
            prices: Object.fromEntries(sizeVariants.map((v) => [v, 0])),
        }));
        onChange({ ...product, sizes: newSizes });
    };

    // Aktualizacja pola
    const updateField = (field: string, value: any) => {
        onChange({ ...product, [field]: value });
    };

    // Aktualizacja ceny (obsługuje warianty)
    const updatePrice = (group: string, value: number, variant?: string) => {
        const currentGroupPrice = product.prices?.[group];

        // Jeśli mamy warianty i przekazano variant
        if (variant && effectiveGroupsVariants.length > 0) {
            const newGroupPrice =
                typeof currentGroupPrice === "object" &&
                currentGroupPrice !== null &&
                !Array.isArray(currentGroupPrice)
                    ? {
                          ...(currentGroupPrice as Record<string, number>),
                          [variant]: value,
                      }
                    : { [variant]: value };
            const newPrices = { ...product.prices, [group]: newGroupPrice };
            onChange({ ...product, prices: newPrices });
        } else {
            // Bez wariantów - prosta wartość
            const newPrices = { ...product.prices, [group]: value };
            onChange({ ...product, prices: newPrices });
        }
    };

    // Pobierz cenę dla grupy i wariantu
    const getPriceValue = (group: string, variant?: string): number => {
        const groupPrice = product.prices?.[group];
        if (
            variant &&
            typeof groupPrice === "object" &&
            groupPrice !== null &&
            !Array.isArray(groupPrice)
        ) {
            return (groupPrice as Record<string, number>)[variant] ?? 0;
        }
        if (typeof groupPrice === "number") {
            return groupPrice;
        }
        return 0;
    };

    // Aktualizacja rozmiaru
    const updateSize = (index: number, field: string, value: any) => {
        const newSizes = [...(product.sizes || [])];
        newSizes[index] = { ...newSizes[index], [field]: value };
        onChange({ ...product, sizes: newSizes });
    };

    // Dodanie rozmiaru
    const addSize = () => {
        // Jeśli są warianty (produktu lub kategorii), inicjalizuj prices jako obiekt
        const initialPrices =
            effectiveVariants.length > 0
                ? Object.fromEntries(effectiveVariants.map((v) => [v, 0]))
                : 0;
        const newSizes = [
            ...(product.sizes || []),
            { dimension: "", prices: initialPrices },
        ];
        onChange({ ...product, sizes: newSizes });
    };

    // Aktualizacja ceny wariantu rozmiaru
    const updateSizeVariantPrice = (
        sizeIndex: number,
        variant: string,
        value: number
    ) => {
        const newSizes = [...(product.sizes || [])];
        const currentPrices = newSizes[sizeIndex].prices;
        if (typeof currentPrices === "object" && currentPrices !== null) {
            newSizes[sizeIndex] = {
                ...newSizes[sizeIndex],
                prices: {
                    ...(currentPrices as Record<string, number>),
                    [variant]: value,
                },
            };
        } else {
            // Konwertuj pojedynczą cenę na obiekt z wariantami
            newSizes[sizeIndex] = {
                ...newSizes[sizeIndex],
                prices: { [variant]: value },
            };
        }
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
                            <>
                                {/* Warianty materiałowe - z możliwością edycji */}
                                {(effectiveGroupsVariants.length > 0 ||
                                    groupsVariants.length > 0) && (
                                    <div
                                        className={`mb-3 p-2 rounded flex flex-wrap items-center gap-2 ${
                                            hasCustomGroupsVariants
                                                ? "bg-orange-50"
                                                : "bg-purple-50"
                                        }`}
                                    >
                                        <span
                                            className={`text-xs font-medium ${
                                                hasCustomGroupsVariants
                                                    ? "text-orange-700"
                                                    : "text-purple-700"
                                            }`}
                                        >
                                            {hasCustomGroupsVariants
                                                ? "Własne warianty:"
                                                : "Warianty kategorii:"}
                                        </span>
                                        {effectiveGroupsVariants.map((v) => (
                                            <span
                                                key={v}
                                                className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                                                    hasCustomGroupsVariants
                                                        ? "bg-orange-100 text-orange-800"
                                                        : "bg-purple-100 text-purple-800"
                                                }`}
                                            >
                                                {v}
                                                <button
                                                    onClick={() =>
                                                        removeGroupsVariantFromProduct(
                                                            v
                                                        )
                                                    }
                                                    className="hover:text-red-600 ml-1"
                                                    title="Usuń wariant z produktu"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const name = prompt(
                                                    "Nazwa własnego wariantu dla tego produktu (np. METAL):"
                                                );
                                                if (name) {
                                                    addGroupsVariantToProduct(
                                                        name
                                                    );
                                                }
                                            }}
                                            className="text-xs text-orange-600 hover:text-orange-800 ml-2"
                                        >
                                            + Własny wariant
                                        </button>
                                        {hasCustomGroupsVariants && (
                                            <button
                                                onClick={
                                                    resetToGroupsCategoryVariants
                                                }
                                                className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                                                title="Przywróć warianty kategorii"
                                            >
                                                ↺ Reset
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Przycisk do dodania własnego wariantu gdy brak wariantów */}
                                {effectiveGroupsVariants.length === 0 &&
                                    groupsVariants.length === 0 && (
                                        <div className="mb-3">
                                            <button
                                                onClick={() => {
                                                    const name = prompt(
                                                        "Nazwa własnego wariantu dla tego produktu (np. METAL):"
                                                    );
                                                    if (name) {
                                                        addGroupsVariantToProduct(
                                                            name
                                                        );
                                                    }
                                                }}
                                                className="text-xs text-orange-600 hover:text-orange-800"
                                            >
                                                + Dodaj własny wariant do
                                                produktu
                                            </button>
                                        </div>
                                    )}

                                {/* Tabela cen z wariantami */}
                                {effectiveGroupsVariants.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium">
                                                        Grupa
                                                    </th>
                                                    {effectiveGroupsVariants.map(
                                                        (v) => (
                                                            <th
                                                                key={v}
                                                                className="text-left py-2 px-2 text-xs text-gray-500 font-medium"
                                                            >
                                                                {v}
                                                            </th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {priceGroups.map((group) => (
                                                    <tr
                                                        key={group}
                                                        className="border-b border-gray-100"
                                                    >
                                                        <td className="py-2 pr-2 text-xs text-gray-600 font-medium">
                                                            {group}
                                                        </td>
                                                        {effectiveGroupsVariants.map(
                                                            (variant) => (
                                                                <td
                                                                    key={
                                                                        variant
                                                                    }
                                                                    className="py-2 px-2"
                                                                >
                                                                    <Input
                                                                        type="number"
                                                                        value={getPriceValue(
                                                                            group,
                                                                            variant
                                                                        )}
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updatePrice(
                                                                                group,
                                                                                parseInt(
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                ) ||
                                                                                    0,
                                                                                variant
                                                                            )
                                                                        }
                                                                        className="h-7 text-sm w-24"
                                                                    />
                                                                </td>
                                                            )
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                        {priceGroups.map((group) => (
                                            <div key={group}>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    {group}
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={getPriceValue(group)}
                                                    onChange={(e) =>
                                                        updatePrice(
                                                            group,
                                                            parseInt(
                                                                e.target.value
                                                            ) || 0
                                                        )
                                                    }
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const name = prompt(
                                        "Nazwa wariantu dla tego produktu (np. Metal Czarny):"
                                    );
                                    if (name && onAddProductVariant) {
                                        onAddProductVariant(name);
                                    }
                                }}
                                className="text-sm text-purple-600 hover:text-purple-800"
                            >
                                + Wariant produktu
                            </button>
                            <button
                                onClick={() => {
                                    const name = prompt(
                                        "Nazwa wariantu dla kategorii (np. BUK, DĄB):"
                                    );
                                    if (name && onAddSizeVariant) {
                                        onAddSizeVariant(name);
                                    }
                                }}
                                className="text-sm text-green-600 hover:text-green-800"
                            >
                                + Wariant kategorii
                            </button>
                            <button
                                onClick={addSize}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                + Dodaj rozmiar
                            </button>
                        </div>
                    </div>

                    {/* Lista wariantów cenowych */}
                    {effectiveVariants.length > 0 && (
                        <div
                            className={`flex flex-wrap items-center gap-2 mb-3 p-2 rounded ${
                                hasCustomVariants
                                    ? "bg-purple-50"
                                    : "bg-green-50"
                            }`}
                        >
                            <span
                                className={`text-xs font-medium ${
                                    hasCustomVariants
                                        ? "text-purple-700"
                                        : "text-green-700"
                                }`}
                            >
                                {hasCustomVariants
                                    ? "Warianty produktu:"
                                    : "Warianty kategorii:"}
                            </span>
                            {effectiveVariants.map((v) => (
                                <span
                                    key={v}
                                    className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                                        hasCustomVariants
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-green-100 text-green-800"
                                    }`}
                                >
                                    {v}
                                    {hasCustomVariants && (
                                        <button
                                            onClick={() =>
                                                removeProductVariant(v)
                                            }
                                            className="ml-1 text-purple-600 hover:text-red-600 font-bold"
                                            title={`Usuń wariant "${v}"`}
                                        >
                                            ×
                                        </button>
                                    )}
                                </span>
                            ))}
                            {hasCustomVariants && (
                                <button
                                    onClick={resetToCategoryVariants}
                                    className="text-xs text-purple-600 hover:text-purple-800 underline ml-2"
                                    title="Resetuj do wariantów kategorii (BUK, DĄB)"
                                >
                                    Resetuj do kategorii
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        {(product.sizes || []).map((size, idx) => {
                            const isMultiplePrices =
                                typeof size.prices === "object" &&
                                size.prices !== null;

                            return (
                                <div
                                    key={idx}
                                    className="bg-white p-3 rounded border space-y-2"
                                >
                                    <div className="flex items-center gap-2">
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
                                            className="flex-1 h-8 text-sm font-medium"
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

                                    {/* Ceny wg wariantów lub pojedyncza cena */}
                                    {effectiveVariants.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {effectiveVariants.map(
                                                (variant) => (
                                                    <div key={variant}>
                                                        <label className="block text-xs text-gray-500 mb-1">
                                                            {variant}
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                isMultiplePrices
                                                                    ? (
                                                                          size.prices as Record<
                                                                              string,
                                                                              number
                                                                          >
                                                                      )[
                                                                          variant
                                                                      ] || 0
                                                                    : 0
                                                            }
                                                            onChange={(e) =>
                                                                updateSizeVariantPrice(
                                                                    idx,
                                                                    variant,
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    ) || 0
                                                                )
                                                            }
                                                            placeholder="Cena"
                                                            className="h-7 text-sm"
                                                        />
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <Input
                                            type="number"
                                            value={
                                                typeof size.prices === "number"
                                                    ? size.prices
                                                    : parseInt(
                                                          size.prices as string
                                                      ) || 0
                                            }
                                            onChange={(e) =>
                                                updateSize(
                                                    idx,
                                                    "prices",
                                                    parseInt(e.target.value) ||
                                                        0
                                                )
                                            }
                                            placeholder="Cena"
                                            className="w-32 h-8 text-sm"
                                        />
                                    )}
                                </div>
                            );
                        })}
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
                                    {priceGroups.map((group) => {
                                        const groupPrice =
                                            element.prices?.[group];
                                        const displayPrice =
                                            typeof groupPrice === "number"
                                                ? groupPrice
                                                : 0;
                                        return (
                                            <div key={group}>
                                                <label className="block text-xs text-gray-400 mb-1">
                                                    {group}
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={displayPrice}
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
                                        );
                                    })}
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
    const [newCategoryType, setNewCategoryType] = useState<"groups" | "sizes">(
        "groups"
    );
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

    // Pobierz typ kategorii z ustawień
    const getCategoryType = (
        catName: string
    ): "groups" | "sizes" | "elements" => {
        // Sprawdź czy jest zapisany typ
        if (data.categorySettings?.[catName]?.type) {
            return data.categorySettings[catName].type!;
        }
        // Wykryj z produktów
        const products = data.categories?.[catName] || {};
        const firstProduct = Object.values(products)[0];
        if (firstProduct?.sizes && firstProduct.sizes.length > 0) {
            return "sizes";
        }
        return "groups";
    };

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

        // Zapisz typ kategorii
        if (!newData.categorySettings) newData.categorySettings = {};
        newData.categorySettings[newCategoryName.trim()] = {
            type: newCategoryType,
        };

        onChange(newData);
        setNewCategoryName("");
        setNewCategoryType("groups");
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
        const categoryType = getCategoryType(catName);

        // Inicjalizuj produkt wg typu kategorii
        const initialProduct: UniversalProduct = {
            image: undefined,
            material: "",
            previousName: "",
        };

        if (categoryType === "sizes") {
            initialProduct.sizes = [];
        } else if (categoryType === "elements" || layoutConfig.showElements) {
            initialProduct.elements = [];
        } else if (layoutConfig.showSinglePrice) {
            initialProduct.price = 0;
            initialProduct.dimensions = "";
            initialProduct.description = "";
        } else {
            // Grupy cenowe
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
        const existingVariants = getCategoryGroupsVariants(catName);

        Object.keys(products).forEach((prodName) => {
            if (
                products[prodName].prices &&
                !(groupName in products[prodName].prices)
            ) {
                // Jeśli są warianty, ustaw obiekt z wariantami
                if (existingVariants.length > 0) {
                    products[prodName].prices![groupName] = Object.fromEntries(
                        existingVariants.map((v) => [v, 0])
                    );
                } else {
                    products[prodName].prices![groupName] = 0;
                }
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

    // Pobierz warianty materiałowe dla kategorii typu groups
    const getCategoryGroupsVariants = (catName: string): string[] => {
        // Najpierw sprawdź categorySettings
        const savedVariants = data.categorySettings?.[catName]?.groupsVariants;
        if (savedVariants && savedVariants.length > 0) {
            return savedVariants;
        }

        // Wykryj z produktów
        const products = data.categories?.[catName] || {};
        const allVariants = new Set<string>();

        Object.values(products).forEach((prod) => {
            if (prod.prices) {
                Object.values(prod.prices).forEach((price: any) => {
                    if (typeof price === "object" && price !== null) {
                        Object.keys(price).forEach((v) => allVariants.add(v));
                    }
                });
            }
        });

        return Array.from(allVariants).sort();
    };

    // Dodaj wariant materiałowy do kategorii typu groups
    const addGroupsVariantToCategory = (
        catName: string,
        variantName: string
    ) => {
        const newData = { ...data };
        if (!newData.categorySettings) newData.categorySettings = {};
        if (!newData.categorySettings[catName])
            newData.categorySettings[catName] = {};

        const currentVariants =
            newData.categorySettings[catName].groupsVariants ||
            getCategoryGroupsVariants(catName);
        if (!currentVariants.includes(variantName)) {
            newData.categorySettings[catName].groupsVariants = [
                ...currentVariants,
                variantName,
            ];
        }

        // Dodaj wariant do wszystkich produktów z prices (grupy cenowe)
        const products = newData.categories[catName] || {};
        const priceGroups = getCategoryPriceGroups(catName);

        Object.keys(products).forEach((prodName) => {
            if (products[prodName].prices) {
                const newPrices: Record<string, any> = {};

                priceGroups.forEach((group) => {
                    const currentPrice = products[prodName].prices![group];

                    if (
                        typeof currentPrice === "object" &&
                        currentPrice !== null &&
                        !Array.isArray(currentPrice)
                    ) {
                        // Już obiekt z wariantami - dodaj nowy wariant
                        const currentPriceObj = currentPrice as Record<
                            string,
                            number
                        >;
                        newPrices[group] = {
                            ...currentPriceObj,
                            [variantName]: currentPriceObj[variantName] ?? 0,
                        };
                    } else {
                        // Pojedyncza wartość - konwertuj na obiekt z wariantami
                        const oldPrice =
                            typeof currentPrice === "number" ? currentPrice : 0;
                        const allVariants = [
                            ...currentVariants,
                            variantName,
                        ].filter((v, i, arr) => arr.indexOf(v) === i);
                        newPrices[group] = Object.fromEntries(
                            allVariants.map((v) => [
                                v,
                                v === variantName ? 0 : oldPrice,
                            ])
                        );
                    }
                });

                products[prodName].prices = newPrices;
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

    // Pobierz warianty cenowe dla kategorii typu sizes
    const getCategorySizeVariants = (catName: string): string[] => {
        // Najpierw sprawdź categorySettings
        const savedVariants = data.categorySettings?.[catName]?.variants;
        if (savedVariants && savedVariants.length > 0) {
            return savedVariants;
        }

        // Wykryj z produktów
        const products = data.categories?.[catName] || {};
        const allVariants = new Set<string>();

        Object.values(products).forEach((prod) => {
            if (prod.sizes) {
                prod.sizes.forEach((size: any) => {
                    if (
                        typeof size.prices === "object" &&
                        size.prices !== null
                    ) {
                        Object.keys(size.prices).forEach((v) =>
                            allVariants.add(v)
                        );
                    }
                });
            }
        });

        return Array.from(allVariants).sort();
    };

    // Dodaj wariant cenowy do kategorii sizes
    const addSizeVariantToCategory = (catName: string, variantName: string) => {
        const newData = { ...data };
        if (!newData.categorySettings) newData.categorySettings = {};
        if (!newData.categorySettings[catName])
            newData.categorySettings[catName] = {};

        const currentVariants =
            newData.categorySettings[catName].variants ||
            getCategorySizeVariants(catName);
        if (!currentVariants.includes(variantName)) {
            newData.categorySettings[catName].variants = [
                ...currentVariants,
                variantName,
            ];
        }

        // Dodaj wariant do wszystkich produktów z sizes
        const products = newData.categories[catName] || {};
        Object.keys(products).forEach((prodName) => {
            if (products[prodName].sizes) {
                products[prodName].sizes = products[prodName].sizes!.map(
                    (size: any) => {
                        const currentPrices = size.prices;
                        if (
                            typeof currentPrices === "object" &&
                            currentPrices !== null
                        ) {
                            return {
                                ...size,
                                prices: {
                                    ...currentPrices,
                                    [variantName]:
                                        currentPrices[variantName] ?? 0,
                                },
                            };
                        } else {
                            // Konwertuj pojedynczą cenę na obiekt
                            const oldPrice =
                                typeof currentPrices === "number"
                                    ? currentPrices
                                    : parseInt(currentPrices as string) || 0;
                            return {
                                ...size,
                                prices: { [variantName]: oldPrice },
                            };
                        }
                    }
                );
            }
        });

        onChange(newData);
    };

    // Dodaj wariant cenowy tylko dla konkretnego produktu
    const addVariantToProduct = (
        catName: string,
        prodName: string,
        variantName: string
    ) => {
        const newData = { ...data };
        const product = newData.categories[catName]?.[prodName];

        if (!product || !product.sizes) return;

        product.sizes = product.sizes.map((size: any) => {
            const currentPrices = size.prices;
            if (typeof currentPrices === "object" && currentPrices !== null) {
                return {
                    ...size,
                    prices: {
                        ...currentPrices,
                        [variantName]: currentPrices[variantName] ?? 0,
                    },
                };
            } else {
                const oldPrice =
                    typeof currentPrices === "number"
                        ? currentPrices
                        : parseInt(currentPrices as string) || 0;
                return {
                    ...size,
                    prices: { [variantName]: oldPrice },
                };
            }
        });

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
                                    getCategoryType(catName) === "groups" && (
                                        <div className="mt-4 mb-4 p-3 bg-blue-50 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-blue-800">
                                                    Grupy cenowe
                                                </span>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const name = prompt(
                                                                "Nazwa wariantu (np. BUK, DĄB, METAL):"
                                                            );
                                                            if (name)
                                                                addGroupsVariantToCategory(
                                                                    catName,
                                                                    name
                                                                );
                                                        }}
                                                        className="text-sm text-purple-600 hover:text-purple-800"
                                                    >
                                                        + Dodaj wariant
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const name = prompt(
                                                                "Nazwa grupy cenowej (np. Grupa I, Grupa II):"
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
                                            </div>

                                            {/* Warianty materiałowe */}
                                            {getCategoryGroupsVariants(catName)
                                                .length > 0 && (
                                                <div className="mb-2 flex flex-wrap gap-2 items-center">
                                                    <span className="text-xs text-purple-700 font-medium">
                                                        Warianty:
                                                    </span>
                                                    {getCategoryGroupsVariants(
                                                        catName
                                                    ).map((v) => (
                                                        <span
                                                            key={v}
                                                            className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs"
                                                        >
                                                            {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2">
                                                {priceGroups.length > 0 ? (
                                                    priceGroups.map((g) => (
                                                        <span
                                                            key={g}
                                                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                                                        >
                                                            {g}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-blue-600 italic">
                                                        Brak grup cenowych.
                                                        Kliknij &quot;+ Dodaj
                                                        grupę&quot; aby dodać
                                                        pierwszą grupę.
                                                    </span>
                                                )}
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
                                                            sizeVariants={getCategorySizeVariants(
                                                                catName
                                                            )}
                                                            groupsVariants={getCategoryGroupsVariants(
                                                                catName
                                                            )}
                                                            showSizes={
                                                                getCategoryType(
                                                                    catName
                                                                ) === "sizes" ||
                                                                (product.sizes
                                                                    ?.length ??
                                                                    0) > 0
                                                            }
                                                            showElements={
                                                                getCategoryType(
                                                                    catName
                                                                ) ===
                                                                    "elements" ||
                                                                layoutConfig.showElements
                                                            }
                                                            showSinglePrice={
                                                                layoutConfig.showSinglePrice
                                                            }
                                                            producerSlug={
                                                                producer.slug
                                                            }
                                                            onAddSizeVariant={(
                                                                variant
                                                            ) =>
                                                                addSizeVariantToCategory(
                                                                    catName,
                                                                    variant
                                                                )
                                                            }
                                                            onAddGroupsVariant={(
                                                                variant
                                                            ) =>
                                                                addGroupsVariantToCategory(
                                                                    catName,
                                                                    variant
                                                                )
                                                            }
                                                            onAddProductVariant={(
                                                                variant
                                                            ) =>
                                                                addVariantToProduct(
                                                                    catName,
                                                                    prodName,
                                                                    variant
                                                                )
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
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nazwa kategorii"
                            className="flex-1"
                            onKeyDown={(e) =>
                                e.key === "Enter" && addCategory()
                            }
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Typ cen:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="categoryType"
                                checked={newCategoryType === "groups"}
                                onChange={() => setNewCategoryType("groups")}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                                Grupy cenowe (np. Grupa I, II...)
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="categoryType"
                                checked={newCategoryType === "sizes"}
                                onChange={() => setNewCategoryType("sizes")}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                                Wymiary i ceny (np. Ø110x310 - 5660zł)
                            </span>
                        </label>
                    </div>
                    <div className="flex items-end justify-end">
                        <Button onClick={addCategory}>Dodaj kategorię</Button>
                    </div>
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
