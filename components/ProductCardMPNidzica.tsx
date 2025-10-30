"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type ElementPrices = {
    prices: Record<string, Record<string, number>>; // Grupa cenowa -> { A, B, C, D }
};

type ProductDataMPNidzica = {
    image?: string;
    material?: string;
    elements?: Record<string, ElementPrices>; // Element (3F, 2F BB, PUF) -> ceny
    options?: string[];
    previousName?: string;
    notes?: string;
};

type ProductOverride = {
    id: string;
    manufacturer: string;
    category: string;
    productName: string;
    customName: string | null;
    priceFactor: number;
    discount: number | null;
    customPrice: number | null;
    customPreviousName: string | null;
    customImage: string | null;
};

export default function ProductCardMPNidzica({
    name,
    data,
    category,
    overrides,
}: {
    name: string;
    data: ProductDataMPNidzica;
    category: string;
    overrides: Record<string, ProductOverride>;
}) {
    const [expandedElement, setExpandedElement] = useState<string | null>(null);

    // Pobierz nadpisanie z przekazanego obiektu
    const override = useMemo(() => {
        const key = `${category}__${name}`;
        const found = overrides[key];
        if (found) {
            return {
                customName: found.customName,
                priceFactor: found.priceFactor,
                discount: found.discount,
                customPrice: found.customPrice,
                customPreviousName: found.customPreviousName,
                customImage: found.customImage,
            };
        }
        return null;
    }, [overrides, category, name]);

    // Funkcja do obliczenia ceny z faktorem i/lub promocją
    const calculatePrice = (
        basePrice: number
    ): {
        finalPrice: number;
        originalPrice?: number;
        hasDiscount: boolean;
    } => {
        // Jeśli jest ustawiona customPrice, użyj jej i ignoruj resztę
        if (override?.customPrice && override.customPrice > 0) {
            const customPriceNum = Number(override.customPrice);

            // Jeśli jest promocja, zastosuj ją też do custom price
            if (override.discount && override.discount > 0) {
                const discountedPrice = Math.round(
                    customPriceNum * (1 - override.discount / 100)
                );
                return {
                    finalPrice: discountedPrice,
                    originalPrice: Math.round(customPriceNum),
                    hasDiscount: true,
                };
            }

            return {
                finalPrice: Math.round(customPriceNum),
                hasDiscount: false,
            };
        }

        // W przeciwnym razie użyj normalnego obliczenia z faktorem
        const factor = override?.priceFactor || 1.0;
        const priceWithFactor = Math.round(basePrice * factor);

        // Jeśli jest promocja, zastosuj ją do ceny po faktorem
        if (override?.discount && override.discount > 0) {
            const discountedPrice = Math.round(
                priceWithFactor * (1 - override.discount / 100)
            );
            return {
                finalPrice: discountedPrice,
                originalPrice: priceWithFactor,
                hasDiscount: true,
            };
        }

        return {
            finalPrice: priceWithFactor,
            hasDiscount: false,
        };
    };

    // Nazwa do wyświetlenia
    const displayName = override?.customName || name;
    const hasDiscount = override?.discount && override.discount > 0;
    const displayImage = override?.customImage || data.image;
    const displayPreviousName =
        override?.customPreviousName || data.previousName;

    const toggleElement = (elementName: string) => {
        setExpandedElement(
            expandedElement === elementName ? null : elementName
        );
    };

    return (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
            {displayPreviousName && (
                <p className="text-sm text-gray-500 mb-3 absolute bottom-0 right-3">
                    ({displayPreviousName})
                </p>
            )}
            {data.notes && (
                <span className="absolute right-4 top-4 text-xs py-1 px-3 rounded-full bg-red-600 text-white font-semibold">
                    {data.notes}
                </span>
            )}
            {hasDiscount && (
                <span className="absolute left-4 top-4 text-xs py-1 px-3 rounded-full bg-red-600 text-white font-semibold shadow-lg">
                    PROMOCJA -{override.discount}%
                </span>
            )}

            <div className="flex justify-center mb-4">
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt=""
                        height={200}
                        width={200}
                        className="h-48 w-48 object-contain"
                    />
                ) : (
                    <div className="h-48 w-48 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-sm">
                            Brak zdjęcia
                        </span>
                    </div>
                )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
                {displayName}
            </h3>

            {override?.customName && (
                <p className="text-xs text-gray-500 mb-2">Oryginalna: {name}</p>
            )}

            {data.material && (
                <p className="text-sm font-semibold text-gray-700 mb-3">
                    {data.material}
                </p>
            )}

            {/* ELEMENTY (3F, 2F BB, PUF) */}
            {data.elements && Object.keys(data.elements).length > 0 && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Elementy i ceny brutto:
                    </p>
                    <div className="space-y-2">
                        {Object.entries(data.elements).map(
                            ([elementName, elementData]) => {
                                const isExpanded =
                                    expandedElement === elementName;
                                const groupCount = Object.keys(
                                    elementData.prices || {}
                                ).length;

                                return (
                                    <div
                                        key={elementName}
                                        className="border border-gray-200 rounded-lg overflow-hidden"
                                    >
                                        <button
                                            onClick={() =>
                                                toggleElement(elementName)
                                            }
                                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900">
                                                    {elementName}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ({groupCount}{" "}
                                                    {groupCount === 1
                                                        ? "grupa"
                                                        : "grupy"}
                                                    )
                                                </span>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-gray-500" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-500" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="p-4 bg-white">
                                                {Object.entries(
                                                    elementData.prices || {}
                                                ).map(([grupa, ceny]) => (
                                                    <div
                                                        key={grupa}
                                                        className="mb-4 last:mb-0"
                                                    >
                                                        <p className="text-sm font-semibold text-gray-700 mb-2">
                                                            {grupa}:
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Object.entries(
                                                                ceny
                                                            ).map(
                                                                ([
                                                                    letter,
                                                                    price,
                                                                ]) => {
                                                                    const priceResult =
                                                                        calculatePrice(
                                                                            price
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                letter
                                                                            }
                                                                            className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded hover:bg-green-100 transition-colors"
                                                                        >
                                                                            <span className="font-medium text-gray-700">
                                                                                {
                                                                                    letter
                                                                                }
                                                                                :
                                                                            </span>
                                                                            <div className="flex flex-col items-end">
                                                                                <span
                                                                                    className={`font-semibold ${
                                                                                        priceResult.hasDiscount
                                                                                            ? "text-red-600"
                                                                                            : "text-gray-900"
                                                                                    }`}
                                                                                >
                                                                                    {
                                                                                        priceResult.finalPrice
                                                                                    }{" "}
                                                                                    zł
                                                                                </span>
                                                                                {priceResult.originalPrice && (
                                                                                    <span className="text-xs text-gray-400 line-through">
                                                                                        {
                                                                                            priceResult.originalPrice
                                                                                        }{" "}
                                                                                        zł
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        )}
                    </div>
                </div>
            )}

            {/* OPCJE */}
            {data.options && data.options.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Opcje:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                        {data.options.map((option, i) => (
                            <li key={i} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{option}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
