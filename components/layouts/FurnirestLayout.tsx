"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
    FurnirestData,
    FurnirestProductData,
    Surcharge,
    CategorySettings,
} from "@/lib/types";

interface Props {
    data: FurnirestData & {
        categorySettings?: Record<string, CategorySettings>;
        categoryPriceFactors?: Record<string, number>;
    };
    title?: string;
    priceFactor?: number;
}

// Funkcja do normalizacji tekstu do ID
function normalizeToId(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export default function FurnirestLayout({
    data,
    title,
    priceFactor = 1,
}: Props) {
    const [search, setSearch] = useState("");

    // Filtruj kategorie i produkty po nazwie
    const filteredCategories = useMemo(() => {
        if (!search.trim()) return data.categories || {};

        const query = search.toLowerCase();
        const result: Record<string, Record<string, FurnirestProductData>> = {};

        Object.entries(data.categories || {}).forEach(([catName, products]) => {
            const filtered = Object.entries(products).filter(
                ([name, productData]) =>
                    name.toLowerCase().includes(query) ||
                    (productData.previousName &&
                        productData.previousName.toLowerCase().includes(query))
            );
            if (filtered.length > 0) {
                result[catName] = Object.fromEntries(filtered);
            }
        });

        return result;
    }, [data.categories, search]);

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity space-y-12">
            <PageHeader
                title={title || data.title}
                search={search}
                onSearchChange={setSearch}
            />

            {Object.keys(filteredCategories).length > 0 ? (
                Object.entries(filteredCategories).map(
                    ([categoryName, products]) => {
                        const categorySurcharges =
                            data.categorySettings?.[categoryName]?.surcharges ||
                            [];
                        const categoryFactor =
                            data.categoryPriceFactors?.[categoryName] ??
                            priceFactor;

                        return (
                            <div
                                key={categoryName}
                                id={categoryName}
                                className="w-full max-w-7xl mx-auto scroll-mt-8"
                            >
                                <p className="text-start w-full text-2xl font-semibold mb-6 capitalize">
                                    {categoryName}:
                                </p>

                                <div className="grid grid-cols-1 gap-6">
                                    {Object.entries(products).map(
                                        ([productName, productData], idx) => (
                                            <FurnirestProductCard
                                                key={productName + idx}
                                                name={productName}
                                                data={productData}
                                                priceFactor={categoryFactor}
                                                surcharges={categorySurcharges}
                                                categoryType={
                                                    data.categorySettings?.[
                                                        categoryName
                                                    ]?.type || "groups"
                                                }
                                                categoryVariants={
                                                    data.categorySettings?.[
                                                        categoryName
                                                    ]?.variants || []
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    }
                )
            ) : (
                <p className="text-center text-gray-500 text-lg mt-10">
                    Brak produktów
                </p>
            )}
        </div>
    );
}

// ============================================
// PRODUCT CARD WITH PRICE MATRIX
// ============================================

interface ProductCardProps {
    name: string;
    data: FurnirestProductData;
    priceFactor?: number;
    surcharges?: Surcharge[];
    categoryType?: "groups" | "elements";
    categoryVariants?: string[];
}

function FurnirestProductCard({
    name,
    data,
    priceFactor = 1,
    surcharges = [],
    categoryType = "groups",
    categoryVariants = [],
}: ProductCardProps) {
    const [imageLoading, setImageLoading] = useState(true);
    const productId = `product-${normalizeToId(name)}`;

    const { priceMatrix, elements } = data;
    const groups = priceMatrix?.groups || [];
    const columns = priceMatrix?.columns || [];
    const values = priceMatrix?.values || {};
    const dimensions = priceMatrix?.dimensions || {};

    // Sprawdź czy są jakieś wymiary uzupełnione (dla trybu groups)
    const hasDimensions = Object.values(dimensions).some(
        (d) => d && d.trim() !== ""
    );

    // Sprawdź czy elementy mają wymiary (dla trybu elements)
    const elementsHaveDimensions = elements?.some(
        (el) => el.dimension && el.dimension.trim() !== ""
    );

    // Use category variants for elements mode
    const variants = categoryVariants;

    // Oblicz cenę z faktorem
    const calculatePrice = (basePrice: number): number => {
        const productFactor = data.priceFactor ?? 1;
        const effectiveFactor = Math.max(priceFactor, productFactor);
        return Math.round(basePrice * effectiveFactor);
    };

    return (
        <Card
            id={productId}
            className="overflow-hidden border-0 shadow-lg scroll-mt-24 relative"
        >
            {/* Tooltip z informacjami: previousName i priceFactor */}
            {(data.previousName || priceFactor !== 1) && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="absolute bottom-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-10">
                            <HelpCircle className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {data.previousName && (
                            <p>Poprzednia nazwa: {data.previousName}</p>
                        )}
                        {priceFactor !== 1 && (
                            <p className="mt-1">
                                Faktor: x{priceFactor.toFixed(2)}
                            </p>
                        )}
                    </TooltipContent>
                </Tooltip>
            )}

            <CardContent className="p-0">
                {/* Header: Image + Name */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 ">
                    {/* Image */}
                    {data.image && (
                        <div className="relative w-full sm:w-52 h-52 flex-shrink-0">
                            {imageLoading && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded-lg" />
                            )}
                            <Image
                                src={data.image}
                                alt={name}
                                fill
                                className="object-contain"
                                onLoad={() => setImageLoading(false)}
                            />
                        </div>
                    )}

                    {/* Name + Info */}
                    <div className="flex-1 flex flex-col justify-start items-end p-4">
                        <h3 className="text-4xl font-bold text-orange-900">
                            {name}
                        </h3>
                        {data.material && (
                            <p className="text-sm text-gray-600 mt-1">
                                {data.material}
                            </p>
                        )}
                        {data.discount && data.discount > 0 && (
                            <Badge variant="destructive" className="w-fit mt-2">
                                -{data.discount}%
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Price Matrix Table (for "groups" mode) */}
                {categoryType === "groups" &&
                    groups.length > 0 &&
                    columns.length > 0 && (
                        <div className="p-4">
                            <ScrollArea className="w-full">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="text-left p-2 font-semibold text-gray-700 border border-gray-200 sticky left-0 bg-gray-100 z-10">
                                                Grupa
                                            </th>
                                            {hasDimensions && (
                                                <th className="text-center p-2 font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[120px]">
                                                    Wymiar
                                                </th>
                                            )}
                                            {/* Kolumny bazowe + kolumny z dopłatami */}
                                            {columns.map((col) => (
                                                <>
                                                    <th
                                                        key={col}
                                                        className="text-center p-2 font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[100px]"
                                                    >
                                                        {col}
                                                    </th>
                                                    {/* Dodatkowe kolumny dla każdej dopłaty */}
                                                    {surcharges.map((s) => (
                                                        <th
                                                            key={`${col}-${s.label}`}
                                                            className="text-center p-2 font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[120px] bg-amber-50"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span>
                                                                    {col}
                                                                </span>
                                                                <span className="text-xs font-normal text-amber-700">
                                                                    {s.label}
                                                                </span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((group, groupIdx) => (
                                            <tr
                                                key={group}
                                                className={
                                                    groupIdx % 2 === 0
                                                        ? "bg-white"
                                                        : "bg-gray-50"
                                                }
                                            >
                                                <td className="p-2 font-medium text-gray-900 border border-gray-200 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                                                    {group}
                                                </td>
                                                {hasDimensions && (
                                                    <td className="text-center p-2 border border-gray-200 text-gray-600">
                                                        {dimensions[group] ||
                                                            "—"}
                                                    </td>
                                                )}
                                                {/* Ceny bazowe + ceny z dopłatami */}
                                                {columns.map((col) => {
                                                    const basePrice =
                                                        values[group]?.[col] ||
                                                        0;
                                                    const finalPrice =
                                                        calculatePrice(
                                                            basePrice
                                                        );
                                                    return (
                                                        <>
                                                            <td
                                                                key={col}
                                                                className="text-center p-2 border border-gray-200"
                                                            >
                                                                {basePrice >
                                                                0 ? (
                                                                    <span className="font-semibold text-amber-700">
                                                                        {finalPrice.toLocaleString(
                                                                            "pl-PL"
                                                                        )}{" "}
                                                                        zł
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {/* Kolumny z dopłatami */}
                                                            {surcharges.map(
                                                                (s) => {
                                                                    const surchargePrice =
                                                                        basePrice >
                                                                        0
                                                                            ? Math.round(
                                                                                  finalPrice *
                                                                                      (1 +
                                                                                          s.percent /
                                                                                              100)
                                                                              )
                                                                            : 0;
                                                                    return (
                                                                        <td
                                                                            key={`${col}-${s.label}`}
                                                                            className="text-center p-2 border border-gray-200 bg-amber-50/50"
                                                                        >
                                                                            {surchargePrice >
                                                                            0 ? (
                                                                                <span className="font-semibold text-amber-800">
                                                                                    {surchargePrice.toLocaleString(
                                                                                        "pl-PL"
                                                                                    )}{" "}
                                                                                    zł
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-400">
                                                                                    —
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                }
                                                            )}
                                                        </>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    )}

                {/* Elements Table (for "elements" mode) */}
                {categoryType === "elements" &&
                    elements &&
                    elements.length > 0 && (
                        <div className="p-4">
                            <ScrollArea className="w-full">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="text-left p-2 font-semibold text-gray-700 border border-gray-200 sticky left-0 bg-gray-100 z-10">
                                                Element
                                            </th>
                                            {elementsHaveDimensions && (
                                                <th className="text-center p-2 font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[120px]">
                                                    Wymiar
                                                </th>
                                            )}
                                            {/* Kolumny wariantów */}
                                            {variants.map((variant) => (
                                                <>
                                                    <th
                                                        key={variant}
                                                        className="text-center p-2 font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[100px]"
                                                    >
                                                        {variant}
                                                    </th>
                                                    {/* Kolumny z dopłatami dla każdego wariantu */}
                                                    {surcharges.map((s) => (
                                                        <th
                                                            key={`${variant}-${s.label}`}
                                                            className="text-center p-2 font-semibold text-gray-700 border border-gray-200 whitespace-nowrap min-w-[120px] bg-amber-50"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span>
                                                                    {variant}
                                                                </span>
                                                                <span className="text-xs font-normal text-amber-700">
                                                                    {s.label}
                                                                </span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {elements.map((el, idx) => (
                                            <>
                                                <tr
                                                    key={idx}
                                                    className={
                                                        idx % 2 === 0
                                                            ? "bg-white"
                                                            : "bg-gray-50"
                                                    }
                                                >
                                                    <td className="p-2 font-medium text-gray-900 border border-gray-200 sticky left-0 bg-inherit z-10">
                                                        {el.name}
                                                    </td>
                                                    {elementsHaveDimensions && (
                                                        <td className="text-center p-2 border border-gray-200 text-gray-600">
                                                            {el.dimension ||
                                                                "—"}
                                                        </td>
                                                    )}
                                                    {/* Ceny per wariant + dopłaty */}
                                                    {variants.map((variant) => {
                                                        const basePrice =
                                                            el.prices?.[
                                                                variant
                                                            ] || 0;
                                                        const finalPrice =
                                                            calculatePrice(
                                                                basePrice
                                                            );
                                                        return (
                                                            <>
                                                                <td
                                                                    key={
                                                                        variant
                                                                    }
                                                                    className="text-center p-2 border border-gray-200"
                                                                >
                                                                    {basePrice >
                                                                    0 ? (
                                                                        <span className="font-semibold text-amber-700">
                                                                            {finalPrice.toLocaleString(
                                                                                "pl-PL"
                                                                            )}{" "}
                                                                            zł
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-400">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Dopłaty dla tego wariantu */}
                                                                {surcharges.map(
                                                                    (s) => {
                                                                        const surchargePrice =
                                                                            basePrice >
                                                                            0
                                                                                ? Math.round(
                                                                                      finalPrice *
                                                                                          (1 +
                                                                                              s.percent /
                                                                                                  100)
                                                                                  )
                                                                                : 0;
                                                                        return (
                                                                            <td
                                                                                key={`${variant}-${s.label}`}
                                                                                className="text-center p-2 border border-gray-200 bg-amber-50/50"
                                                                            >
                                                                                {surchargePrice >
                                                                                0 ? (
                                                                                    <span className="font-semibold text-amber-800">
                                                                                        {surchargePrice.toLocaleString(
                                                                                            "pl-PL"
                                                                                        )}{" "}
                                                                                        zł
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-400">
                                                                                        —
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    }
                                                                )}
                                                            </>
                                                        );
                                                    })}
                                                </tr>
                                                {/* Note row under each element */}
                                                {el.note && (
                                                    <tr className="bg-gray-50/70">
                                                        <td
                                                            colSpan={
                                                                1 +
                                                                (elementsHaveDimensions
                                                                    ? 1
                                                                    : 0) +
                                                                variants.length *
                                                                    (1 +
                                                                        surcharges.length)
                                                            }
                                                            className="px-3 py-1.5 text-xs text-gray-600 italic border border-gray-200"
                                                        >
                                                            {el.note}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    )}

                {/* Options */}
                {data.options && data.options.length > 0 && (
                    <div className="px-4 pb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Opcje:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.options.map((opt, idx) => (
                                <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-800"
                                >
                                    {opt}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Description */}
                {data.description && data.description.length > 0 && (
                    <div className="px-4 pb-4">
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {data.description.map((desc, idx) => (
                                <li key={idx}>{desc}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Notes */}
                {data.notes && (
                    <div className="px-4 pb-4">
                        <p className="text-xs text-gray-500 italic">
                            {data.notes}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
