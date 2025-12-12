"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type {
    MpNidzicaData,
    MpNidzicaProduct,
    ProducerConfig,
} from "@/lib/types";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    AddButton,
    ImageUploader,
    IconButton,
    Button,
    ConfirmDialog,
} from "@/components/ui";
import { GlobalSurchargesEditor } from "./GlobalSurchargesEditor";

interface Props {
    data: MpNidzicaData;
    onChange: (data: MpNidzicaData) => void;
    producer: ProducerConfig;
}

export function MpNidzicaEditor({ data, onChange, producer }: Props) {
    const [deleteProductConfirm, setDeleteProductConfirm] = useState<{
        isOpen: boolean;
        index: number;
    }>({ isOpen: false, index: -1 });
    const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<{
        isOpen: boolean;
        groupName: string;
    }>({ isOpen: false, groupName: "" });

    // Globalne grupy cenowe
    const priceGroups = data.priceGroups || [];

    // ============================================
    // GLOBAL PRICE GROUP HANDLERS
    // ============================================

    const addPriceGroup = () => {
        const groupName = prompt("Nazwa grupy cenowej (np. A, B, C, D):");
        if (!groupName || priceGroups.includes(groupName)) return;

        // Dodaj grupę do globalnej listy i do wszystkich elementów we wszystkich produktach
        const newGroups = [...priceGroups, groupName];
        const updatedProducts = (data.products || []).map((product) => {
            const elements = Array.isArray(product.elements)
                ? product.elements
                : [];
            const updatedElements = elements.map((el) => ({
                ...el,
                prices: { ...el.prices, [groupName]: 0 },
            }));
            return { ...product, elements: updatedElements };
        });

        onChange({
            ...data,
            priceGroups: newGroups,
            products: updatedProducts,
        });
    };

    const removePriceGroup = (groupName: string) => {
        setDeleteGroupConfirm({ isOpen: true, groupName });
    };

    const confirmRemovePriceGroup = () => {
        const groupName = deleteGroupConfirm.groupName;
        // Usuń z globalnej listy i z wszystkich elementów we wszystkich produktach
        const newGroups = priceGroups.filter((g) => g !== groupName);
        const updatedProducts = (data.products || []).map((product) => {
            const elements = Array.isArray(product.elements)
                ? product.elements
                : [];
            const updatedElements = elements.map((el) => {
                const newPrices = { ...el.prices };
                delete newPrices[groupName];
                return { ...el, prices: newPrices };
            });
            return { ...product, elements: updatedElements };
        });

        onChange({
            ...data,
            priceGroups: newGroups,
            products: updatedProducts,
        });
        setDeleteGroupConfirm({ isOpen: false, groupName: "" });
    };

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
    };

    const updateProduct = (index: number, productData: MpNidzicaProduct) => {
        const newProducts = [...(data.products || [])];
        newProducts[index] = productData;
        onChange({ ...data, products: newProducts });
    };

    const deleteProduct = (index: number) => {
        setDeleteProductConfirm({ isOpen: true, index });
    };

    const confirmDeleteProduct = () => {
        const newProducts = [...(data.products || [])];
        newProducts.splice(deleteProductConfirm.index, 1);
        onChange({ ...data, products: newProducts });
        setDeleteProductConfirm({ isOpen: false, index: -1 });
    };

    const updateSurcharges = (surcharges: any[]) => {
        onChange({ ...data, surcharges });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Global Price Groups */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-blue-800">
                        Grupy cenowe (globalne dla wszystkich produktów)
                    </label>
                    <button
                        onClick={addPriceGroup}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                        + Dodaj grupę
                    </button>
                </div>

                {priceGroups.length === 0 ? (
                    <p className="text-sm text-blue-600">
                        Brak grup cenowych. Dodaj grupy (np. &quot;A&quot;,
                        &quot;B&quot;, &quot;C&quot;, &quot;D&quot;), a będą
                        automatycznie dostępne dla wszystkich elementów we
                        wszystkich produktach.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {priceGroups.map((group) => (
                            <span
                                key={group}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                            >
                                {group}
                                <button
                                    onClick={() => removePriceGroup(group)}
                                    className="hover:text-red-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Global Surcharges */}
            <GlobalSurchargesEditor
                surcharges={data.surcharges || []}
                onChange={updateSurcharges}
            />

            {/* Products Accordion */}
            <Accordion type="multiple" className="space-y-3">
                {(data.products || []).map((product, index) => (
                    <AccordionItem
                        key={index}
                        value={`product-${index}`}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                            <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">
                                        {product.name}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        (
                                        {
                                            (Array.isArray(product.elements)
                                                ? product.elements
                                                : []
                                            ).length
                                        }{" "}
                                        elementów)
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProduct(index);
                                    }}
                                    className="text-gray-400 hover:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                            <MpNidzicaProductEditor
                                product={product}
                                onChange={(newData) =>
                                    updateProduct(index, newData)
                                }
                                producer={producer}
                                priceGroups={priceGroups}
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <AddButton fullWidth onClick={addProduct} className="py-3">
                <Plus className="w-5 h-5" />
                Dodaj produkt
            </AddButton>

            {/* Delete Product Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteProductConfirm.isOpen}
                onClose={() =>
                    setDeleteProductConfirm({ isOpen: false, index: -1 })
                }
                onConfirm={confirmDeleteProduct}
                title="Usunąć produkt?"
                description="Czy na pewno chcesz usunąć ten produkt? Ta operacja jest nieodwracalna."
                confirmText="Usuń"
                cancelText="Anuluj"
                variant="danger"
            />

            {/* Delete Price Group Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteGroupConfirm.isOpen}
                onClose={() =>
                    setDeleteGroupConfirm({ isOpen: false, groupName: "" })
                }
                onConfirm={confirmRemovePriceGroup}
                title="Usunąć grupę cenową?"
                description={`Czy na pewno chcesz usunąć grupę "${deleteGroupConfirm.groupName}" ze wszystkich produktów i elementów?`}
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
    product: MpNidzicaProduct;
    onChange: (data: MpNidzicaProduct) => void;
    producer: ProducerConfig;
    priceGroups: string[]; // Globalne grupy cenowe z głównego edytora
}

function MpNidzicaProductEditor({
    product,
    onChange,
    producer,
    priceGroups,
}: ProductEditorProps) {
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

            {/* Previous Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poprzednia nazwa
                </label>
                <input
                    type="text"
                    value={product.previousName || ""}
                    onChange={(e) =>
                        onChange({
                            ...product,
                            previousName: e.target.value || undefined,
                        })
                    }
                    placeholder="opcjonalnie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Price Factor */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mnożnik ceny (faktor)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={product.priceFactor ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...product,
                            priceFactor: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                        })
                    }
                    placeholder="np. 1.2 = +20%"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Pozostaw puste dla domyślnej wartości (1.0). Wartość 1.2
                    oznacza +20% do cen.
                </p>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rabat (%)
                    </label>
                    <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={product.discount ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...product,
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opis rabatu
                    </label>
                    <input
                        type="text"
                        value={product.discountLabel ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...product,
                                discountLabel: e.target.value || undefined,
                            })
                        }
                        placeholder="np. stały rabat"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
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

                            {/* Prices - używa globalnych grup */}
                            {priceGroups.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {priceGroups.map((group) => (
                                        <div
                                            key={group}
                                            className="flex items-center gap-1"
                                        >
                                            <span className="text-xs text-gray-600 min-w-[40px]">
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

                            {priceGroups.length === 0 && (
                                <p className="text-xs text-gray-400">
                                    Najpierw dodaj grupy cenowe na górze strony.
                                </p>
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
