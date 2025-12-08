"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type {
    MpNidzicaData,
    MpNidzicaProduct,
    ProducerConfig,
} from "@/lib/types";
import {
    CollapsibleCard,
    AddButton,
    ImageUploader,
    IconButton,
} from "@/components/ui";

interface Props {
    data: MpNidzicaData;
    onChange: (data: MpNidzicaData) => void;
    producer: ProducerConfig;
}

export function MpNidzicaEditor({ data, onChange, producer }: Props) {
    const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

    // ============================================
    // PRODUCT HANDLERS
    // ============================================

    const addProduct = () => {
        const newProduct: MpNidzicaProduct = {
            name: "Nowy produkt",
            image: undefined,
            technicalImage: undefined,
            elements: [],
        };
        onChange({
            ...data,
            products: [...(data.products || []), newProduct],
        });
        setExpandedProduct((data.products || []).length);
    };

    const updateProduct = (index: number, productData: MpNidzicaProduct) => {
        const newProducts = [...(data.products || [])];
        newProducts[index] = productData;
        onChange({ ...data, products: newProducts });
    };

    const deleteProduct = (index: number) => {
        if (!confirm("Usunąć ten produkt?")) return;
        const newProducts = [...(data.products || [])];
        newProducts.splice(index, 1);
        onChange({ ...data, products: newProducts });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Products */}
            <div className="space-y-3">
                {(data.products || []).map((product, index) => (
                    <CollapsibleCard
                        key={index}
                        title={product.name}
                        subtitle={`(${
                            (Array.isArray(product.elements)
                                ? product.elements
                                : []
                            ).length
                        } elementów)`}
                        isExpanded={expandedProduct === index}
                        onToggle={() =>
                            setExpandedProduct(
                                expandedProduct === index ? null : index
                            )
                        }
                        onDelete={() => deleteProduct(index)}
                    >
                        <MpNidzicaProductEditor
                            product={product}
                            onChange={(newData) =>
                                updateProduct(index, newData)
                            }
                            producer={producer}
                        />
                    </CollapsibleCard>
                ))}
            </div>

            <AddButton fullWidth onClick={addProduct} className="py-3">
                <Plus className="w-5 h-5" />
                Dodaj produkt
            </AddButton>
        </div>
    );
}

// ============================================
// PRODUCT EDITOR
// ============================================

interface ProductEditorProps {
    product: MpNidzicaProduct;
    onChange: (data: MpNidzicaProduct) => void;
    producer: ProducerConfig;
}

function MpNidzicaProductEditor({
    product,
    onChange,
    producer,
}: ProductEditorProps) {
    // Grupy cenowe są zapisane w produkcie (persystentne)
    const priceGroups = product.priceGroups || [];

    // ============================================
    // PRICE GROUP HANDLERS (wspólne dla wszystkich elementów)
    // ============================================

    const addPriceGroup = () => {
        const groupName = prompt(
            "Nazwa grupy cenowej (np. Grupa I, Standard):"
        );
        if (!groupName || priceGroups.includes(groupName)) return;

        // Dodaj grupę do listy i do wszystkich istniejących elementów
        const newGroups = [...priceGroups, groupName];
        const elements = Array.isArray(product.elements)
            ? product.elements
            : [];
        const updatedElements = elements.map((el) => ({
            ...el,
            prices: { ...el.prices, [groupName]: 0 },
        }));
        onChange({
            ...product,
            priceGroups: newGroups,
            elements: updatedElements,
        });
    };

    const removePriceGroup = (groupName: string) => {
        if (!confirm(`Usunąć grupę "${groupName}" ze wszystkich elementów?`))
            return;

        // Usuń z listy grup i z wszystkich elementów
        const newGroups = priceGroups.filter((g) => g !== groupName);
        const elements = Array.isArray(product.elements)
            ? product.elements
            : [];
        const updatedElements = elements.map((el) => {
            const newPrices = { ...el.prices };
            delete newPrices[groupName];
            return { ...el, prices: newPrices };
        });
        onChange({
            ...product,
            priceGroups: newGroups,
            elements: updatedElements,
        });
    };

    // ============================================
    // ELEMENT HANDLERS
    // ============================================

    const addElement = () => {
        const elements = Array.isArray(product.elements)
            ? product.elements
            : [];

        // Nowy element ma wszystkie zdefiniowane grupy cenowe
        const defaultPrices: Record<string, number> = {};
        priceGroups.forEach((group) => {
            defaultPrices[group] = 0;
        });

        onChange({
            ...product,
            elements: [
                ...elements,
                {
                    code: "NOWY",
                    prices: defaultPrices,
                    description: [],
                },
            ],
        });
    };

    const updateElement = (index: number, elementData: any) => {
        const elements = [
            ...(Array.isArray(product.elements) ? product.elements : []),
        ];
        elements[index] = elementData;
        onChange({ ...product, elements });
    };

    const deleteElement = (index: number) => {
        const elements = [
            ...(Array.isArray(product.elements) ? product.elements : []),
        ];
        elements.splice(index, 1);
        onChange({ ...product, elements });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Product Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nazwa produktu
                </label>
                <input
                    type="text"
                    value={product.name || ""}
                    onChange={(e) =>
                        onChange({ ...product, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Images */}
            <div className="grid grid-cols-2 gap-4">
                <ImageUploader
                    label="Zdjęcie główne"
                    value={product.image || null}
                    onChange={(path) =>
                        onChange({ ...product, image: path || undefined })
                    }
                    producerSlug={producer.slug}
                    size="sm"
                />
                <ImageUploader
                    label="Rysunek techniczny"
                    value={product.technicalImage || null}
                    onChange={(path) =>
                        onChange({
                            ...product,
                            technicalImage: path || undefined,
                        })
                    }
                    producerSlug={producer.slug}
                    size="sm"
                />
            </div>

            {/* Price Groups Definition */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-blue-800">
                        Grupy cenowe (wspólne dla wszystkich elementów)
                    </label>
                    <button
                        onClick={addPriceGroup}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                        + Dodaj grupę
                    </button>
                </div>

                {priceGroups.length === 0 ? (
                    <p className="text-xs text-blue-600">
                        Brak grup cenowych. Dodaj grupy (np. &quot;Grupa
                        I&quot;, &quot;Grupa II&quot;), a będą automatycznie
                        dostępne dla wszystkich elementów.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {priceGroups.map((group) => (
                            <span
                                key={group}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium"
                            >
                                {group}
                                <button
                                    onClick={() => removePriceGroup(group)}
                                    className="hover:text-red-600 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Elements */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Elementy (
                        {
                            (Array.isArray(product.elements)
                                ? product.elements
                                : []
                            ).length
                        }
                        )
                    </label>
                    <button
                        onClick={addElement}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj element
                    </button>
                </div>

                <div className="space-y-2">
                    {(Array.isArray(product.elements)
                        ? product.elements
                        : []
                    ).map((element, index) => (
                        <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-3 space-y-2"
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={element.code || ""}
                                    onChange={(e) =>
                                        updateElement(index, {
                                            ...element,
                                            code: e.target.value,
                                        })
                                    }
                                    placeholder="Kod elementu"
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                                />
                                <IconButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => deleteElement(index)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </IconButton>
                            </div>

                            {/* Prices - używa wspólnych grup */}
                            {priceGroups.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {priceGroups.map((group) => (
                                        <div
                                            key={group}
                                            className="flex items-center gap-1"
                                        >
                                            <span className="text-xs text-gray-600 min-w-[60px]">
                                                {group}:
                                            </span>
                                            <input
                                                type="number"
                                                value={
                                                    element.prices?.[group] || 0
                                                }
                                                onChange={(e) => {
                                                    const newPrices = {
                                                        ...element.prices,
                                                        [group]:
                                                            parseInt(
                                                                e.target.value
                                                            ) || 0,
                                                    };
                                                    updateElement(index, {
                                                        ...element,
                                                        prices: newPrices,
                                                    });
                                                }}
                                                className="w-20 px-2 py-1 border border-gray-200 rounded text-xs text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {(Array.isArray(product.elements) ? product.elements : [])
                    .length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                        Brak elementów. Kliknij &quot;+ Dodaj element&quot; aby
                        dodać pierwszy.
                    </p>
                )}
            </div>
        </div>
    );
}
