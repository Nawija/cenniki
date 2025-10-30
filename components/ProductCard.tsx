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
};

type ProductOverride = {
    id: string;
    manufacturer: string;
    category: string;
    productName: string;
    customName: string | null;
    priceFactor: number;
};

export default function ProductCard({
    name,
    data,
    category,
    overrides,
}: {
    name: string;
    data: ProductData;
    category: string;
    overrides: Record<string, ProductOverride>;
}) {
    // Pobierz nadpisanie z przekazanego obiektu
    const override = useMemo(() => {
        const key = `${category}__${name}`;
        const found = overrides[key];
        if (found) {
            return {
                customName: found.customName,
                priceFactor: found.priceFactor,
            };
        }
        return null;
    }, [overrides, category, name]);

    // Funkcja do obliczenia ceny z faktorem
    const calculatePrice = (basePrice: number): number => {
        const factor = override?.priceFactor || 1.0;
        return Math.round(basePrice * factor);
    };

    // Nazwa do wyświetlenia
    const displayName = override?.customName || name;
    const hasOverride = override?.priceFactor && override.priceFactor !== 1.0;

    return (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
            {data.previousName && (
                <p className="text-sm text-gray-500 mb-3 absolute bottom-0 right-3">
                    ({data.previousName})
                </p>
            )}
            {data.notes && (
                <span className="absolute right-4 top-4 text-xs py-1 px-3 rounded-full bg-red-600 text-white font-semibold">
                    {data.notes}
                </span>
            )}
            {hasOverride && (
                <span className="absolute left-4 top-4 text-xs py-1 px-3 rounded-full bg-blue-600 text-white font-semibold">
                    {override.priceFactor}x
                </span>
            )}

            <div className="flex justify-center mb-4">
                {data.image ? (
                    <Image
                        src={data.image}
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
                            const finalPrice = calculatePrice(price);

                            return (
                                <div
                                    key={group}
                                    className="flex justify-between text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 border-gray-100"
                                >
                                    <span className="text-gray-600">
                                        {group}:
                                    </span>
                                    <div className="flex flex-col items-end">
                                        <span
                                            className={`font-semibold text-gray-900 `}
                                        >
                                            {finalPrice} zł
                                        </span>
                                    </div>
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
                            const finalPrice = calculatePrice(priceValue);
                            const priceChanged = finalPrice !== priceValue;

                            return (
                                <div
                                    key={i}
                                    className="text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 flex justify-between border-gray-100 py-1 last:border-0"
                                >
                                    <div className="font-semibold text-gray-900">
                                        {size.dimension}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span
                                            className={`${
                                                hasOverride
                                                    ? "text-blue-600 font-semibold"
                                                    : "text-gray-600"
                                            }`}
                                        >
                                            {finalPrice} zł
                                        </span>
                                        {priceChanged && (
                                            <span className="text-xs text-gray-400 line-through">
                                                {size.prices} zł
                                            </span>
                                        )}
                                    </div>
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
