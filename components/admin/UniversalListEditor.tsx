"use client";

import { useState, useMemo } from "react";
import {
    Plus,
    Trash2,
    X,
    Search,
    GripVertical,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import Image from "next/image";
import type {
    ListBasedData,
    TableBasedData,
    DynamicGroupsData,
    UniversalProduct,
    ProducerConfig,
    Surcharge,
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

// Typ unii dla różnych formatów danych
type ListData = ListBasedData | TableBasedData | DynamicGroupsData;

interface Props {
    data: ListData;
    onChange: (data: ListData) => void;
    producer: ProducerConfig;
}

// ============================================
// HELPER: Normalizacja danych
// ============================================

function getProducts(data: ListData): UniversalProduct[] {
    if ("Arkusz1" in data) return data.Arkusz1 || [];
    if ("products" in data) return data.products || [];
    return [];
}

function setProducts(data: ListData, products: UniversalProduct[]): ListData {
    if ("Arkusz1" in data) return { ...data, Arkusz1: products };
    return { ...data, products };
}

function getPriceGroups(data: ListData, layoutType: string): string[] {
    if ("priceGroups" in data && data.priceGroups) return data.priceGroups;

    // Domyślne grupy dla Puszman
    if (layoutType === "puszman") {
        return [
            "grupa I",
            "grupa II",
            "grupa III",
            "grupa IV",
            "grupa V",
            "grupa VI",
        ];
    }

    // Wykryj z produktów
    const products = getProducts(data);
    const groups = new Set<string>();

    products.forEach((p) => {
        // Z prices
        Object.keys(p.prices || {}).forEach((g) => groups.add(g));
        // Z pól Puszman
        [
            "grupa I",
            "grupa II",
            "grupa III",
            "grupa IV",
            "grupa V",
            "grupa VI",
        ].forEach((g) => {
            if (p[g] !== undefined) groups.add(g);
        });
        // Z elementów
        if (Array.isArray(p.elements)) {
            p.elements.forEach((el: any) => {
                Object.keys(el.prices || {}).forEach((g) => groups.add(g));
            });
        }
    });

    return Array.from(groups);
}

function getProductName(product: UniversalProduct): string {
    return product.name || product.MODEL || "Bez nazwy";
}

// Pobierz grupy cenowe dla konkretnej kategorii (lub globalne jeśli brak)
function getCategoryPriceGroups(
    data: ListData,
    category: string | undefined
): string[] | null {
    if (!category) return null;
    if ("categoryPriceGroups" in data && data.categoryPriceGroups) {
        return data.categoryPriceGroups[category] || null;
    }
    return null;
}

// Pobierz mapę wszystkich grup cenowych per kategoria
function getAllCategoryPriceGroups(data: ListData): Record<string, string[]> {
    if ("categoryPriceGroups" in data && data.categoryPriceGroups) {
        return data.categoryPriceGroups;
    }
    return {};
}

// ============================================
// EDYTOR POJEDYNCZEGO PRODUKTU
// ============================================

interface ProductEditorProps {
    product: UniversalProduct;
    priceGroups: string[];
    onChange: (product: UniversalProduct) => void;
    layoutType: string;
    producerSlug: string;
}

function ProductEditor({
    product,
    priceGroups,
    onChange,
    layoutType,
    producerSlug,
}: ProductEditorProps) {
    const [expandedSections, setExpandedSections] = useState<string[]>([
        "prices",
    ]);
    const isPuszman = layoutType === "puszman";
    // Pokaż sekcję elementów jeśli layoutType to mpnidzica/product-list LUB produkt ma już elementy
    const hasElements =
        layoutType === "mpnidzica" ||
        layoutType === "product-list" ||
        (Array.isArray(product.elements) && product.elements.length > 0);

    const toggleSection = (section: string) => {
        setExpandedSections((prev) =>
            prev.includes(section)
                ? prev.filter((s) => s !== section)
                : [...prev, section]
        );
    };

    const updateField = (field: string, value: any) => {
        onChange({ ...product, [field]: value });
    };

    const updatePrice = (group: string, value: number) => {
        if (isPuszman) {
            onChange({ ...product, [group]: value });
        } else {
            onChange({
                ...product,
                prices: { ...product.prices, [group]: value },
            });
        }
    };

    const getPrice = (group: string): number => {
        if (isPuszman) return (product[group] as number) || 0;
        return (product.prices?.[group] as number) || 0;
    };

    // Elementy (dla MpNidzica)
    const updateElement = (index: number, field: string, value: any) => {
        const elements = [...(product.elements || [])];
        elements[index] = { ...elements[index], [field]: value };
        onChange({ ...product, elements });
    };

    const updateElementPrice = (
        elementIndex: number,
        group: string,
        value: number
    ) => {
        const elements = [...(product.elements || [])];
        elements[elementIndex] = {
            ...elements[elementIndex],
            prices: { ...elements[elementIndex].prices, [group]: value },
        };
        onChange({ ...product, elements });
    };

    const addElement = () => {
        const initialPrices: Record<string, number> = {};
        priceGroups.forEach((g) => (initialPrices[g] = 0));
        const elements = [
            ...(product.elements || []),
            { code: "NOWY", prices: initialPrices },
        ];
        onChange({ ...product, elements });
    };

    const removeElement = (index: number) => {
        const elements = [...(product.elements || [])];
        elements.splice(index, 1);
        onChange({ ...product, elements });
    };

    return (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Główne informacje */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Obrazki (dla MpNidzica) */}
                {!isPuszman && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zdjęcie główne
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
                        {/* Zdjęcie techniczne - dla layoutów z elementami (mpnidzica, product-list) */}
                        {(hasElements ||
                            product.technicalImage !== undefined) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Zdjęcie techniczne
                                </label>
                                <ImageUploader
                                    value={product.technicalImage || null}
                                    onChange={(url: string | null) =>
                                        updateField(
                                            "technicalImage",
                                            url || undefined
                                        )
                                    }
                                    producerSlug={producerSlug}
                                    folder="technical"
                                />
                            </div>
                        )}
                    </div>
                )}

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
                    {isPuszman && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Kolor nogi
                            </label>
                            <Input
                                value={product["KOLOR NOGI"] || ""}
                                onChange={(e) =>
                                    updateField("KOLOR NOGI", e.target.value)
                                }
                                placeholder="np. czarny"
                                className="h-9"
                            />
                        </div>
                    )}
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
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Opis rabatu
                        </label>
                        <Input
                            value={product.discountLabel || ""}
                            onChange={(e) =>
                                updateField("discountLabel", e.target.value)
                            }
                            placeholder="np. Tkaniny: Modesto 492"
                            className="h-9"
                        />
                    </div>
                </div>
            </div>

            {/* Opis produktu (dla MpNidzica) */}
            {hasElements && (
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opis produktu
                    </label>
                    <textarea
                        value={product.description || ""}
                        onChange={(e) =>
                            updateField("description", e.target.value)
                        }
                        placeholder="Szczegółowy opis produktu (wypełnienie, nogi, funkcje itp.)"
                        className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    />
                </div>
            )}

            {/* Ceny proste (dla Puszman, BestMeble) */}
            {!hasElements && (
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {priceGroups.map((group) => (
                                <div key={group}>
                                    <label
                                        className="block text-xs text-gray-500 mb-1 truncate"
                                        title={group}
                                    >
                                        {group}
                                    </label>
                                    <Input
                                        type="number"
                                        value={getPrice(group)}
                                        onChange={(e) =>
                                            updatePrice(
                                                group,
                                                parseInt(e.target.value) || 0
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

            {/* Elementy z cenami (dla MpNidzica) */}
            {hasElements && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                            Elementy i ceny
                        </label>
                        <button
                            onClick={addElement}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Dodaj element
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(product.elements || []).map(
                            (element: PriceElement, idx: number) => (
                                <div
                                    key={idx}
                                    className="bg-white p-3 rounded border space-y-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={
                                                element.code ||
                                                element.name ||
                                                ""
                                            }
                                            onChange={(e) =>
                                                updateElement(
                                                    idx,
                                                    "code",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Kod elementu"
                                            className="flex-1 h-8 text-sm font-medium"
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
                                    {/* Opis elementu (wymiary itp.) - pokazuje się po kliknięciu */}
                                    {element.description !== undefined ? (
                                        <div>
                                            <Input
                                                value={
                                                    Array.isArray(
                                                        element.description
                                                    )
                                                        ? element.description.join(
                                                              "; "
                                                          )
                                                        : element.description ||
                                                          ""
                                                }
                                                onChange={(e) => {
                                                    const value =
                                                        e.target.value;
                                                    // Jeśli zawiera średniki, podziel na tablicę
                                                    const descValue =
                                                        value.includes(";")
                                                            ? value
                                                                  .split(";")
                                                                  .map((s) =>
                                                                      s.trim()
                                                                  )
                                                                  .filter(
                                                                      Boolean
                                                                  )
                                                            : value ||
                                                              undefined;
                                                    updateElement(
                                                        idx,
                                                        "description",
                                                        descValue
                                                    );
                                                }}
                                                placeholder="Opis elementu (np. wymiary: 200x100 cm; pow. spania: 180x90 cm)"
                                                className="h-8 text-sm text-gray-600"
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateElement(
                                                    idx,
                                                    "description",
                                                    ""
                                                )
                                            }
                                            className="text-xs text-blue-500 hover:text-blue-700"
                                        >
                                            + Dodaj opis
                                        </button>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {priceGroups.map((group) => (
                                            <div key={group}>
                                                <label className="block text-xs text-gray-400 mb-1">
                                                    {group}
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={
                                                        (element.prices?.[
                                                            group
                                                        ] as number) || 0
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
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper do pobierania kategorii produktów
function getProductCategories(data: ListData): string[] {
    if ("productCategories" in data && Array.isArray(data.productCategories)) {
        return data.productCategories;
    }
    return [];
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export function UniversalListEditor({ data, onChange, producer }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        index: number;
    }>({ isOpen: false, index: -1 });
    const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<{
        isOpen: boolean;
        groupName: string;
    }>({ isOpen: false, groupName: "" });
    const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<{
        isOpen: boolean;
        categoryName: string;
    }>({ isOpen: false, categoryName: "" });
    const [deleteCategoryGroupConfirm, setDeleteCategoryGroupConfirm] =
        useState<{
            isOpen: boolean;
            categoryName: string;
            groupName: string;
        }>({ isOpen: false, categoryName: "", groupName: "" });

    const products = getProducts(data);
    const priceGroups = getPriceGroups(data, producer.layoutType);
    const productCategories = getProductCategories(data);
    const categoryPriceGroups = getAllCategoryPriceGroups(data);
    const isPuszman = producer.layoutType === "puszman";
    const hasElements =
        producer.layoutType === "mpnidzica" ||
        producer.layoutType === "product-list";

    // Filtrowanie i sortowanie produktów
    const filteredProducts = useMemo(() => {
        let filtered = products;

        // Filtruj po kategorii
        if (categoryFilter !== "all" && productCategories.length > 0) {
            if (categoryFilter === "uncategorized") {
                filtered = filtered.filter((p) => !p.category);
            } else {
                filtered = filtered.filter(
                    (p) => p.category === categoryFilter
                );
            }
        }

        // Filtruj po wyszukiwaniu
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((p) => {
                const name = getProductName(p).toLowerCase();
                const prevName = (p.previousName || "").toLowerCase();
                return name.includes(query) || prevName.includes(query);
            });
        }

        // Sortuj po kategorii (produkty z tą samą kategorią razem)
        if (productCategories.length > 0 && categoryFilter === "all") {
            filtered = [...filtered].sort((a, b) => {
                const catA = a.category || "zzz_uncategorized"; // Bez kategorii na końcu
                const catB = b.category || "zzz_uncategorized";
                const indexA = productCategories.indexOf(catA);
                const indexB = productCategories.indexOf(catB);
                // Sortuj według kolejności w productCategories, nieznane na końcu
                const orderA = indexA === -1 ? 999 : indexA;
                const orderB = indexB === -1 ? 999 : indexB;
                return orderA - orderB;
            });
        }

        return filtered;
    }, [products, searchQuery, categoryFilter, productCategories]);

    // ============================================
    // PRICE GROUP HANDLERS
    // ============================================

    const addPriceGroup = () => {
        const groupName = prompt("Nazwa grupy cenowej:");
        if (!groupName || priceGroups.includes(groupName)) return;

        const newGroups = [...priceGroups, groupName];
        const updatedProducts = products.map((product) => {
            if (isPuszman) {
                return { ...product, [groupName]: 0 };
            }
            if (Array.isArray(product.elements)) {
                return {
                    ...product,
                    elements: product.elements.map((el: PriceElement) => ({
                        ...el,
                        prices: { ...el.prices, [groupName]: 0 },
                    })),
                };
            }
            return {
                ...product,
                prices: { ...product.prices, [groupName]: 0 },
            };
        });

        let newData = setProducts(data, updatedProducts);
        // Zawsze zapisuj priceGroups dla formatów innych niż Puszman (który używa Arkusz1)
        if (!("Arkusz1" in newData)) {
            newData = { ...newData, priceGroups: newGroups };
        }
        onChange(newData);
    };

    const removePriceGroup = (groupName: string) => {
        setDeleteGroupConfirm({ isOpen: true, groupName });
    };

    const confirmRemovePriceGroup = () => {
        const groupName = deleteGroupConfirm.groupName;
        const newGroups = priceGroups.filter((g) => g !== groupName);

        const updatedProducts = products.map((product) => {
            if (isPuszman) {
                const { [groupName]: removed, ...rest } = product;
                return rest;
            }
            if (Array.isArray(product.elements)) {
                return {
                    ...product,
                    elements: product.elements.map((el: PriceElement) => {
                        const { [groupName]: removed, ...restPrices } =
                            el.prices;
                        return { ...el, prices: restPrices };
                    }),
                };
            }
            const { [groupName]: removed, ...restPrices } =
                product.prices || {};
            return { ...product, prices: restPrices };
        });

        let newData = setProducts(data, updatedProducts);
        // Zawsze zapisuj priceGroups dla formatów innych niż Puszman
        if (!("Arkusz1" in newData)) {
            newData = { ...newData, priceGroups: newGroups };
        }
        onChange(newData);
        setDeleteGroupConfirm({ isOpen: false, groupName: "" });
    };

    // ============================================
    // PRODUCT CATEGORY HANDLERS
    // ============================================

    const addProductCategory = () => {
        const categoryName = prompt("Nazwa kategorii produktów:");
        if (!categoryName || productCategories.includes(categoryName)) return;

        const newCategories = [...productCategories, categoryName];
        onChange({ ...data, productCategories: newCategories } as ListData);
    };

    const removeProductCategory = (categoryName: string) => {
        setDeleteCategoryConfirm({ isOpen: true, categoryName });
    };

    const confirmRemoveProductCategory = () => {
        const categoryName = deleteCategoryConfirm.categoryName;
        const newCategories = productCategories.filter(
            (c) => c !== categoryName
        );

        // Usuń kategorię z produktów które ją mają
        const updatedProducts = products.map((product) => {
            if (product.category === categoryName) {
                const { category, ...rest } = product;
                return rest;
            }
            return product;
        });

        let newData = setProducts(data, updatedProducts);
        newData = { ...newData, productCategories: newCategories } as ListData;

        // Usuń również grupy cenowe tej kategorii
        if ("categoryPriceGroups" in newData && newData.categoryPriceGroups) {
            const { [categoryName]: _, ...restGroups } =
                newData.categoryPriceGroups;
            newData = {
                ...newData,
                categoryPriceGroups: restGroups,
            } as ListData;
        }

        onChange(newData);
        setDeleteCategoryConfirm({ isOpen: false, categoryName: "" });
    };

    const updateProductCategory = (
        index: number,
        category: string | undefined
    ) => {
        const newProducts = [...products];
        if (category) {
            newProducts[index] = { ...newProducts[index], category };
        } else {
            const { category: _, ...rest } = newProducts[index];
            newProducts[index] = rest;
        }
        onChange(setProducts(data, newProducts));
    };

    // ============================================
    // CATEGORY PRICE GROUPS HANDLERS
    // ============================================

    const addCategoryPriceGroup = (categoryName: string) => {
        const groupName = prompt(
            `Nazwa grupy cenowej dla kategorii "${categoryName}":`
        );
        if (!groupName) return;

        const currentCategoryGroups = categoryPriceGroups[categoryName] || [];
        if (currentCategoryGroups.includes(groupName)) return;

        const newCategoryGroups = [...currentCategoryGroups, groupName];
        const newCategoryPriceGroups = {
            ...categoryPriceGroups,
            [categoryName]: newCategoryGroups,
        };

        // Zaktualizuj produkty w tej kategorii - dodaj nową grupę cenową
        const updatedProducts = products.map((product) => {
            if (
                product.category === categoryName &&
                Array.isArray(product.elements)
            ) {
                return {
                    ...product,
                    elements: product.elements.map((el: PriceElement) => ({
                        ...el,
                        prices: { ...el.prices, [groupName]: 0 },
                    })),
                };
            }
            return product;
        });

        let newData = setProducts(data, updatedProducts);
        newData = {
            ...newData,
            categoryPriceGroups: newCategoryPriceGroups,
        } as ListData;
        onChange(newData);
    };

    const removeCategoryPriceGroup = (
        categoryName: string,
        groupName: string
    ) => {
        setDeleteCategoryGroupConfirm({
            isOpen: true,
            categoryName,
            groupName,
        });
    };

    const confirmRemoveCategoryPriceGroup = () => {
        const { categoryName, groupName } = deleteCategoryGroupConfirm;
        const currentCategoryGroups = categoryPriceGroups[categoryName] || [];
        const newCategoryGroups = currentCategoryGroups.filter(
            (g) => g !== groupName
        );

        const newCategoryPriceGroups = {
            ...categoryPriceGroups,
            [categoryName]: newCategoryGroups,
        };

        // Jeśli nie ma już żadnych grup, usuń kategorię z mapowania
        if (newCategoryGroups.length === 0) {
            delete newCategoryPriceGroups[categoryName];
        }

        // Usuń grupę cenową z produktów tej kategorii
        const updatedProducts = products.map((product) => {
            if (
                product.category === categoryName &&
                Array.isArray(product.elements)
            ) {
                return {
                    ...product,
                    elements: product.elements.map((el: PriceElement) => {
                        const { [groupName]: _, ...restPrices } = el.prices;
                        return { ...el, prices: restPrices };
                    }),
                };
            }
            return product;
        });

        let newData = setProducts(data, updatedProducts);
        newData = {
            ...newData,
            categoryPriceGroups:
                Object.keys(newCategoryPriceGroups).length > 0
                    ? newCategoryPriceGroups
                    : undefined,
        } as ListData;
        onChange(newData);
        setDeleteCategoryGroupConfirm({
            isOpen: false,
            categoryName: "",
            groupName: "",
        });
    };

    // Pobierz grupy cenowe dla produktu (z kategorii lub globalne)
    const getPriceGroupsForProduct = (product: UniversalProduct): string[] => {
        if (product.category && categoryPriceGroups[product.category]) {
            return categoryPriceGroups[product.category];
        }
        return priceGroups;
    };

    // ============================================
    // PRODUCT HANDLERS
    // ============================================

    const addProduct = () => {
        const initialPrices: Record<string, number> = {};
        priceGroups.forEach((g) => (initialPrices[g] = 0));

        let newProduct: UniversalProduct;

        if (isPuszman) {
            newProduct = {
                MODEL: "Nowy model",
                "KOLOR NOGI": "",
                previousName: "",
            };
            priceGroups.forEach((g) => (newProduct[g] = 0));
        } else if (hasElements) {
            newProduct = {
                name: "Nowy produkt",
                image: undefined,
                technicalImage: undefined,
                elements: [],
                previousName: "",
            };
        } else {
            newProduct = {
                MODEL: "Nowy produkt",
                prices: initialPrices,
                previousName: "",
            };
        }

        onChange(setProducts(data, [...products, newProduct]));
    };

    const updateProduct = (index: number, productData: UniversalProduct) => {
        const newProducts = [...products];
        newProducts[index] = productData;
        onChange(setProducts(data, newProducts));
    };

    const updateProductName = (index: number, name: string) => {
        const newProducts = [...products];
        if (isPuszman || "MODEL" in newProducts[index]) {
            newProducts[index] = { ...newProducts[index], MODEL: name };
        } else {
            newProducts[index] = { ...newProducts[index], name };
        }
        onChange(setProducts(data, newProducts));
    };

    const deleteProduct = (index: number) => {
        setDeleteConfirm({ isOpen: true, index });
    };

    const confirmDeleteProduct = () => {
        const newProducts = [...products];
        newProducts.splice(deleteConfirm.index, 1);
        onChange(setProducts(data, newProducts));
        setDeleteConfirm({ isOpen: false, index: -1 });
    };

    const updateSurcharges = (surcharges: Surcharge[]) => {
        onChange({ ...data, surcharges } as ListData);
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Grupy cenowe globalne */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-blue-800">
                        Grupy cenowe{" "}
                        {hasElements
                            ? "(globalne dla wszystkich produktów)"
                            : ""}
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
                        Brak grup cenowych. Dodaj grupy cenowe, aby określić
                        ceny produktów.
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

            {/* Kategorie produktów (dla mpnidzica i podobnych) */}
            {!isPuszman && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-green-800">
                            Kategorie produktów
                        </label>
                        <button
                            onClick={addProductCategory}
                            className="text-sm text-green-600 hover:text-green-800 hover:underline font-medium"
                        >
                            + Dodaj kategorię
                        </button>
                    </div>

                    {productCategories.length === 0 ? (
                        <p className="text-sm text-green-600">
                            Brak kategorii. Dodaj kategorie, aby grupować
                            produkty (np. Stoły, Krzesła, Narożniki).
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {productCategories.map((cat) => {
                                const catGroups =
                                    categoryPriceGroups[cat] || [];
                                const usesGlobal = catGroups.length === 0;

                                return (
                                    <div
                                        key={cat}
                                        className="bg-green-100/50 rounded-lg p-3"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-green-800">
                                                {cat}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    removeProductCategory(cat)
                                                }
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Grupy cenowe kategorii */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-green-700">
                                                Grupy cenowe:
                                            </span>
                                            {usesGlobal ? (
                                                <span className="text-xs text-green-600 italic">
                                                    (używa globalnych)
                                                </span>
                                            ) : (
                                                catGroups.map((group) => (
                                                    <span
                                                        key={group}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium"
                                                    >
                                                        {group}
                                                        <button
                                                            onClick={() =>
                                                                removeCategoryPriceGroup(
                                                                    cat,
                                                                    group
                                                                )
                                                            }
                                                            className="hover:text-red-600 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                            <button
                                                onClick={() =>
                                                    addCategoryPriceGroup(cat)
                                                }
                                                className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
                                            >
                                                + Dodaj grupę
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Dopłaty globalne */}
            <GlobalSurchargesEditor
                surcharges={data.surcharges || []}
                onChange={updateSurcharges}
            />

            {/* Wyszukiwarka i filtr kategorii */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <Search className="w-5 h-5 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Szukaj produktu..."
                        className="flex-1 min-w-[200px]"
                    />
                    {productCategories.length > 0 && (
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-gray-200 text-sm"
                        >
                            <option value="all">Wszystkie kategorie</option>
                            <option value="uncategorized">Bez kategorii</option>
                            {productCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    )}
                    <span className="text-sm text-gray-500">
                        {filteredProducts.length} / {products.length} produktów
                    </span>
                </div>
            </div>

            {/* Tryb tabeli dla Puszman */}
            {isPuszman ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                        Model
                                    </th>
                                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                        Poprzednia nazwa
                                    </th>
                                    {priceGroups.map((g) => (
                                        <th
                                            key={g}
                                            className="px-2 py-2 text-center text-sm font-medium text-gray-700"
                                        >
                                            {g}
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                        Kolor nogi
                                    </th>
                                    <th className="px-2 py-2 text-center text-sm font-medium text-gray-700">
                                        Rabat %
                                    </th>
                                    <th className="px-2 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product, index) => {
                                    const realIndex = products.indexOf(product);
                                    return (
                                        <tr
                                            key={realIndex}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="px-3 py-2">
                                                <Input
                                                    value={getProductName(
                                                        product
                                                    )}
                                                    onChange={(e) =>
                                                        updateProductName(
                                                            realIndex,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 text-sm"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input
                                                    value={
                                                        product.previousName ||
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        updateProduct(
                                                            realIndex,
                                                            {
                                                                ...product,
                                                                previousName:
                                                                    e.target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    placeholder="opcjonalnie"
                                                    className="h-8 text-sm"
                                                />
                                            </td>
                                            {priceGroups.map((g) => (
                                                <td
                                                    key={g}
                                                    className="px-2 py-2"
                                                >
                                                    <Input
                                                        type="number"
                                                        value={
                                                            (product[
                                                                g
                                                            ] as number) || 0
                                                        }
                                                        onChange={(e) =>
                                                            updateProduct(
                                                                realIndex,
                                                                {
                                                                    ...product,
                                                                    [g]:
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) || 0,
                                                                }
                                                            )
                                                        }
                                                        className="w-16 h-8 text-sm text-center"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-3 py-2">
                                                <Input
                                                    value={
                                                        product["KOLOR NOGI"] ||
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        updateProduct(
                                                            realIndex,
                                                            {
                                                                ...product,
                                                                "KOLOR NOGI":
                                                                    e.target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    className="h-8 text-sm"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input
                                                    type="number"
                                                    value={
                                                        product.discount ?? ""
                                                    }
                                                    onChange={(e) =>
                                                        updateProduct(
                                                            realIndex,
                                                            {
                                                                ...product,
                                                                discount: e
                                                                    .target
                                                                    .value
                                                                    ? parseInt(
                                                                          e
                                                                              .target
                                                                              .value
                                                                      )
                                                                    : undefined,
                                                            }
                                                        )
                                                    }
                                                    className="w-16 h-8 text-sm text-center"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <IconButton
                                                    onClick={() =>
                                                        deleteProduct(realIndex)
                                                    }
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </IconButton>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Tryb accordion dla innych - z nagłówkami kategorii */
                <Accordion type="multiple" className="space-y-2">
                    {filteredProducts.map((product, index) => {
                        const realIndex = products.indexOf(product);
                        const name = getProductName(product);
                        const currentCategory = product.category || null;
                        const prevProduct =
                            index > 0 ? filteredProducts[index - 1] : null;
                        const prevCategory = prevProduct?.category || null;
                        const showCategoryHeader =
                            productCategories.length > 0 &&
                            categoryFilter === "all" &&
                            currentCategory !== prevCategory;

                        return (
                            <div key={realIndex}>
                                {/* Nagłówek kategorii */}
                                {showCategoryHeader && (
                                    <div className="flex items-center gap-3 py-3 px-2 mt-4 first:mt-0">
                                        <div className="h-px flex-1 bg-gray-300" />
                                        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                            {currentCategory || "Bez kategorii"}
                                        </span>
                                        <div className="h-px flex-1 bg-gray-300" />
                                    </div>
                                )}
                                <AccordionItem
                                    value={`product-${realIndex}`}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                                >
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                                        <div className="flex items-center justify-between w-full pr-2">
                                            <div className="flex items-center gap-3">
                                                {product.image && (
                                                    <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-100">
                                                        <Image
                                                            src={product.image}
                                                            alt={name}
                                                            fill
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={name}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                updateProductName(
                                                                    realIndex,
                                                                    e.target
                                                                        .value
                                                                );
                                                            }}
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                            className="h-8 font-semibold text-gray-900"
                                                        />
                                                        {productCategories.length >
                                                            0 && (
                                                            <select
                                                                value={
                                                                    product.category ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    updateProductCategory(
                                                                        realIndex,
                                                                        e.target
                                                                            .value ||
                                                                            undefined
                                                                    );
                                                                }}
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                                className="h-8 px-2 rounded border border-gray-200 text-xs bg-gray-50"
                                                            >
                                                                <option value="">
                                                                    Bez
                                                                    kategorii
                                                                </option>
                                                                {productCategories.map(
                                                                    (cat) => (
                                                                        <option
                                                                            key={
                                                                                cat
                                                                            }
                                                                            value={
                                                                                cat
                                                                            }
                                                                        >
                                                                            {
                                                                                cat
                                                                            }
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                        )}
                                                    </div>
                                                    {product.previousName && (
                                                        <span className="text-xs text-gray-400 ml-2">
                                                            (dawniej:{" "}
                                                            {
                                                                product.previousName
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteProduct(realIndex);
                                                }}
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </IconButton>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <ProductEditor
                                            product={product}
                                            priceGroups={getPriceGroupsForProduct(
                                                product
                                            )}
                                            onChange={(newProduct) =>
                                                updateProduct(
                                                    realIndex,
                                                    newProduct
                                                )
                                            }
                                            layoutType={producer.layoutType}
                                            producerSlug={producer.slug}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            </div>
                        );
                    })}
                </Accordion>
            )}

            {/* Dodaj produkt */}
            <AddButton onClick={addProduct} className="w-full">
                Dodaj nowy produkt
            </AddButton>

            {/* Dialogi potwierdzenia */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, index: -1 })}
                onConfirm={confirmDeleteProduct}
                title="Usuń produkt"
                description="Czy na pewno chcesz usunąć ten produkt?"
            />

            <ConfirmDialog
                isOpen={deleteGroupConfirm.isOpen}
                onClose={() =>
                    setDeleteGroupConfirm({ isOpen: false, groupName: "" })
                }
                onConfirm={confirmRemovePriceGroup}
                title="Usuń grupę cenową"
                description={`Czy na pewno chcesz usunąć grupę "${deleteGroupConfirm.groupName}"? Ceny w tej grupie zostaną utracone.`}
            />

            <ConfirmDialog
                isOpen={deleteCategoryConfirm.isOpen}
                onClose={() =>
                    setDeleteCategoryConfirm({
                        isOpen: false,
                        categoryName: "",
                    })
                }
                onConfirm={confirmRemoveProductCategory}
                title="Usuń kategorię produktów"
                description={`Czy na pewno chcesz usunąć kategorię "${deleteCategoryConfirm.categoryName}"? Produkty z tej kategorii zostaną oznaczone jako "Bez kategorii".`}
            />

            <ConfirmDialog
                isOpen={deleteCategoryGroupConfirm.isOpen}
                onClose={() =>
                    setDeleteCategoryGroupConfirm({
                        isOpen: false,
                        categoryName: "",
                        groupName: "",
                    })
                }
                onConfirm={confirmRemoveCategoryPriceGroup}
                title="Usuń grupę cenową kategorii"
                description={`Czy na pewno chcesz usunąć grupę "${deleteCategoryGroupConfirm.groupName}" z kategorii "${deleteCategoryGroupConfirm.categoryName}"? Ceny w tej grupie zostaną utracone.`}
            />
        </div>
    );
}

export default UniversalListEditor;
