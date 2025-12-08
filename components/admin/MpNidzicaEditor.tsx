"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
    // ============================================
    // ELEMENT HANDLERS
    // ============================================

    const addElement = () => {
        const elements = Array.isArray(product.elements)
            ? product.elements
            : [];
        onChange({
            ...product,
            elements: [
                ...elements,
                {
                    code: "NOWY",
                    prices: {},
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

    const addPriceGroup = (elementIndex: number) => {
        const groupName = prompt("Nazwa grupy cenowej:");
        if (!groupName) return;

        const elements = Array.isArray(product.elements)
            ? product.elements
            : [];
        const element = elements[elementIndex];
        const newPrices = { ...element.prices, [groupName]: 0 };
        updateElement(elementIndex, { ...element, prices: newPrices });
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

            {/* Elements */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Elementy
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
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <IconButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => deleteElement(index)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </IconButton>
                            </div>

                            {/* Prices */}
                            <div className="pl-4 space-y-1">
                                <p className="text-xs text-gray-500">Ceny:</p>
                                {Object.entries(element.prices || {}).map(
                                    ([group, price]) => (
                                        <div
                                            key={group}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="text-xs text-gray-600 w-20">
                                                {group}:
                                            </span>
                                            <input
                                                type="number"
                                                value={price as number}
                                                onChange={(e) => {
                                                    const newPrices = {
                                                        ...element.prices,
                                                    };
                                                    newPrices[group] =
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0;
                                                    updateElement(index, {
                                                        ...element,
                                                        prices: newPrices,
                                                    });
                                                }}
                                                className="w-20 px-2 py-1 border border-gray-200 rounded text-xs"
                                            />
                                        </div>
                                    )
                                )}
                                <button
                                    onClick={() => addPriceGroup(index)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    + Dodaj grupę cenową
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
