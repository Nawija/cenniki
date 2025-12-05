"use client";

import Image from "next/image";
import { useMemo } from "react";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: Array<{ dimension: string; prices: string | number }>;
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
    priceFactor?: number; // Indywidualny mnożnik ceny produktu
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

export default function ProductCard({
    name,
    data,
    category,
    overrides,
    priceFactor = 1,
    showColorBlendChairs = false,
    showColorBlendTables = true,
}: {
    name: string;
    data: ProductData;
    category: string;
    overrides: Record<string, ProductOverride>;
    priceFactor?: number;
    showColorBlendChairs?: boolean;
    showColorBlendTables?: boolean;
}) {
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

        // W przeciwnym razie użyj globalnego priceFactor + faktora produktu + ewentualnego override
        const productFactor = data.priceFactor ?? 1.0;
        const overrideFactor = override?.priceFactor || 1.0;
        const totalFactor = priceFactor * productFactor * overrideFactor;
        const priceWithFactor = Math.round(basePrice * totalFactor);

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

            {data.dimensions && (
                <p className="text-sm text-gray-600 mb-3">
                    Wymiary: {data.dimensions}
                </p>
            )}

            {/* CENY DLA GRUP (krzesła, sofy, etc.) */}
            {data.prices && Object.keys(data.prices).length > 0 && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Ceny brutto:
                    </p>
                    <div>
                        {Object.entries(data.prices).map(([group, price]) => {
                            const priceResult = calculatePrice(price);
                            const colorBlendPrice = Math.round(
                                priceResult.finalPrice * 1.1
                            );

                            return (
                                <div key={group} className="mb-1">
                                    <div className="flex justify-between text-sm border-b border-dotted odd:bg-gray-50 hover:bg-blue-50 border-gray-100">
                                        <span className="text-gray-600">
                                            {group}:
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <span
                                                className={`font-semibold ${
                                                    priceResult.hasDiscount
                                                        ? "text-red-600"
                                                        : "text-gray-900"
                                                }`}
                                            >
                                                {priceResult.finalPrice} zł
                                            </span>
                                            {priceResult.originalPrice && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    {priceResult.originalPrice}{" "}
                                                    zł
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {showColorBlendChairs && (
                                        <div className="text-sm bg-amber-50 hover:bg-blue-50 border-b border-dotted border-gray-100 flex justify-between py-0.5 px-1">
                                            <span className="text-amber-700 font-semibold text-xs">
                                                + wybarwienie:
                                            </span>
                                            <span className="text-amber-900 font-semibold text-xs">
                                                {colorBlendPrice} zł
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ROZMIARY I CENY (stoły) */}
            {data.sizes && data.sizes.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Dostępne wymiary i ceny brutto:
                    </p>
                    <div>
                        {data.sizes.map((size, i) => {
                            const priceValue =
                                typeof size.prices === "string"
                                    ? parseInt(size.prices.replace(/\s/g, ""))
                                    : size.prices;
                            const priceResult = calculatePrice(priceValue);
                            const colorBlendPrice = Math.round(
                                priceResult.finalPrice * 1.15
                            );

                            return (
                                <div key={i} className="mb-2">
                                    <div className="text-sm border-b border-dotted odd:bg-gray-50 hover:bg-blue-50 flex justify-between border-gray-100 py-1">
                                        <div className="font-semibold text-gray-900">
                                            {size.dimension}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span
                                                className={`${
                                                    priceResult.hasDiscount
                                                        ? "text-red-600 font-semibold"
                                                        : "text-gray-600"
                                                }`}
                                            >
                                                {priceResult.finalPrice} zł
                                            </span>
                                            {priceResult.originalPrice && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    {priceResult.originalPrice}{" "}
                                                    zł
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {showColorBlendTables && (
                                        <div className="text-sm bg-amber-50 hover:bg-blue-50 border-b border-dotted border-gray-100 flex justify-between py-1">
                                            <span className="text-amber-700 font-semibold text-xs">
                                                + łączenie kolorów:
                                            </span>
                                            <span className="text-amber-900 font-semibold text-xs">
                                                {colorBlendPrice} zł
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* OPCJE */}
            {data.options && data.options.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Dostępne opcje:
                    </p>
                    <ul className="space-y-1">
                        {data.options.map((option, i) => (
                            <li
                                key={i}
                                className="text-xs text-gray-600 leading-relaxed"
                            >
                                • {option}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* OPIS */}
            {data.description && data.description.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Opis:
                    </p>
                    <ul className="space-y-1">
                        {data.description.map((desc, i) => (
                            <li
                                key={i}
                                className="text-xs text-gray-600 leading-relaxed"
                            >
                                • {desc}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
