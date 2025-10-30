"use client";

import Image from "next/image";

type ProductSize = {
    dimension: string;
    prices: string | number;
};

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
};

interface ProductComparisonProps {
    productName: string;
    category: string;
    oldData: ProductData | null;
    newData: ProductData;
}

export default function ProductComparison({
    productName,
    category,
    oldData,
    newData,
}: ProductComparisonProps) {
    const isNew = !oldData;

    // Funkcja porównująca wartości
    const hasChanged = (oldVal: unknown, newVal: unknown): boolean => {
        if (oldVal === undefined || oldVal === null)
            return newVal !== undefined && newVal !== null;
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    };

    // Porównanie cen (prices lub sizes)
    const priceChanged =
        hasChanged(oldData?.prices, newData.prices) ||
        hasChanged(oldData?.sizes, newData.sizes);
    const imageChanged = hasChanged(oldData?.image, newData.image);
    const dimensionsChanged = hasChanged(
        oldData?.dimensions,
        newData.dimensions
    );
    const materialChanged = hasChanged(oldData?.material, newData.material);

    // Sprawdź czy COKOLWIEK się zmieniło
    const hasAnyChanges =
        priceChanged ||
        imageChanged ||
        dimensionsChanged ||
        materialChanged ||
        isNew;

    // DEBUG - Wyświetl w konsoli
    console.log(`🔍 ProductComparison: ${productName}`, {
        isNew,
        hasAnyChanges,
        priceChanged,
        imageChanged,
        dimensionsChanged,
        materialChanged,
        oldPrices: oldData?.prices,
        newPrices: newData.prices,
        oldSizes: oldData?.sizes,
        newSizes: newData.sizes,
    });

    return (
        <div className="relative bg-white border-4 border-gray-300 rounded-xl p-6 shadow-xl">
            {/* Badge: Nowy produkt */}
            {isNew && (
                <div className="absolute -top-3 -left-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                    🆕 NOWY PRODUKT
                </div>
            )}

            {/* Nazwa produktu */}
            <h3 className="text-lg font-bold text-gray-900 mb-2">
                {productName}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{category}</p>

            {/* Legenda kolorów - tylko dla istniejących produktów */}
            {!isNew && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mb-4 text-xs">
                    <div className="flex gap-4 items-center justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-400 rounded"></div>
                            <span className="font-semibold">
                                Żółte = Stare dane
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                            <span className="font-semibold">
                                Zielone = Nowe dane
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolumna: PRZED (jeśli istnieje) */}
                {!isNew && oldData && (
                    <div className="border-r pr-4">
                        <h4 className="text-sm font-semibold text-gray-500 mb-3">
                            📋 PRZED
                        </h4>

                        {/* Zdjęcie PRZED */}
                        {oldData.image && (
                            <div
                                className={`mb-4 ${
                                    imageChanged
                                        ? "bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400"
                                        : ""
                                }`}
                            >
                                <p className="text-xs text-gray-600 mb-1 font-semibold">
                                    Zdjęcie:
                                </p>
                                <Image
                                    src={oldData.image}
                                    alt={productName}
                                    width={150}
                                    height={150}
                                    className="object-contain mx-auto"
                                />
                                {imageChanged && (
                                    <p className="text-xs text-orange-700 font-bold mt-1 bg-orange-100 p-1 rounded">
                                        ⚠️ ZMIENIONE
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Wymiary PRZED */}
                        {oldData.dimensions && (
                            <div
                                className={`mb-3 ${
                                    dimensionsChanged
                                        ? "bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400"
                                        : ""
                                }`}
                            >
                                <p className="text-xs text-gray-600 font-semibold">
                                    Wymiary:
                                </p>
                                <p className="text-sm">{oldData.dimensions}</p>
                                {dimensionsChanged && (
                                    <p className="text-xs text-orange-700 font-bold mt-1">
                                        ⚠️ ZMIENIONE
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Materiał PRZED */}
                        {oldData.material && (
                            <div
                                className={`mb-3 ${
                                    materialChanged
                                        ? "bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400"
                                        : ""
                                }`}
                            >
                                <p className="text-xs text-gray-600 font-semibold">
                                    Materiał:
                                </p>
                                <p className="text-sm">{oldData.material}</p>
                                {materialChanged && (
                                    <p className="text-xs text-orange-700 font-bold mt-1">
                                        ⚠️ ZMIENIONE
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Ceny PRZED (prices) */}
                        {oldData.prices && (
                            <div
                                className={`${
                                    priceChanged
                                        ? "bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400"
                                        : ""
                                }`}
                            >
                                <p className="text-xs text-gray-600 font-semibold mb-1">
                                    Ceny:
                                </p>
                                {Object.entries(oldData.prices).map(
                                    ([group, price]) => (
                                        <div
                                            key={group}
                                            className="flex justify-between text-sm"
                                        >
                                            <span>{group}:</span>
                                            <span className="font-semibold">
                                                {price} zł
                                            </span>
                                        </div>
                                    )
                                )}
                                {priceChanged && (
                                    <p className="text-xs text-orange-700 font-bold mt-2">
                                        ⚠️ CENY ZMIENIONE
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Ceny PRZED (sizes) */}
                        {oldData.sizes && (
                            <div
                                className={`${
                                    priceChanged
                                        ? "bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400"
                                        : ""
                                }`}
                            >
                                <p className="text-xs text-gray-600 font-semibold mb-1">
                                    Rozmiary i ceny:
                                </p>
                                {oldData.sizes.map((size, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between text-sm mb-1"
                                    >
                                        <span>{size.dimension}:</span>
                                        <span className="font-semibold">
                                            {size.prices} zł
                                        </span>
                                    </div>
                                ))}
                                {priceChanged && (
                                    <p className="text-xs text-orange-700 font-bold mt-2">
                                        ⚠️ ROZMIARY/CENY ZMIENIONE
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Kolumna: PO (zawsze wyświetlane) */}
                <div className={isNew ? "col-span-2" : ""}>
                    <h4 className="text-sm font-semibold text-green-600 mb-3">
                        ✨ PO {isNew ? "" : "(NOWE DANE)"}
                    </h4>

                    {/* Zdjęcie PO */}
                    {newData.image && (
                        <div
                            className={`mb-4 ${
                                imageChanged && !isNew
                                    ? "bg-green-100 p-3 rounded-lg border-4 border-green-500 shadow-lg"
                                    : ""
                            }`}
                        >
                            <p className="text-xs text-gray-600 mb-1 font-semibold">
                                Zdjęcie:
                            </p>
                            <Image
                                src={newData.image}
                                alt={productName}
                                width={150}
                                height={150}
                                className="object-contain mx-auto"
                            />
                            {imageChanged && !isNew && (
                                <p className="text-xs text-green-700 font-bold mt-2 bg-green-200 p-2 rounded">
                                    ✅ NOWE ZDJĘCIE
                                </p>
                            )}
                        </div>
                    )}

                    {/* Wymiary PO */}
                    {newData.dimensions && (
                        <div
                            className={`mb-3 ${
                                dimensionsChanged && !isNew
                                    ? "bg-green-100 p-3 rounded-lg border-4 border-green-500 shadow-lg"
                                    : ""
                            }`}
                        >
                            <p className="text-xs text-gray-600 font-semibold">
                                Wymiary:
                            </p>
                            <p className="text-sm font-bold text-green-800">
                                {newData.dimensions}
                            </p>
                            {dimensionsChanged && !isNew && (
                                <p className="text-xs text-green-700 font-bold mt-1 bg-green-200 p-1 rounded">
                                    ✅ ZMIENIONE
                                </p>
                            )}
                        </div>
                    )}

                    {/* Materiał PO */}
                    {newData.material && (
                        <div
                            className={`mb-3 ${
                                materialChanged && !isNew
                                    ? "bg-green-100 p-3 rounded-lg border-4 border-green-500 shadow-lg"
                                    : ""
                            }`}
                        >
                            <p className="text-xs text-gray-600 font-semibold">
                                Materiał:
                            </p>
                            <p className="text-sm font-bold text-green-800">
                                {newData.material}
                            </p>
                            {materialChanged && !isNew && (
                                <p className="text-xs text-green-700 font-bold mt-1 bg-green-200 p-1 rounded">
                                    ✅ ZMIENIONE
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ceny PO (prices) */}
                    {newData.prices && (
                        <div
                            className={`${
                                priceChanged && !isNew
                                    ? "bg-green-100 p-4 rounded-lg border-4 border-green-500 shadow-xl"
                                    : ""
                            }`}
                        >
                            <p className="text-xs text-gray-600 font-semibold mb-1">
                                Ceny:
                            </p>
                            {Object.entries(newData.prices).map(
                                ([group, price]) => (
                                    <div
                                        key={group}
                                        className="flex justify-between text-sm font-bold"
                                    >
                                        <span className="text-gray-700">
                                            {group}:
                                        </span>
                                        <span className="text-green-700 text-lg">
                                            {price} zł
                                        </span>
                                    </div>
                                )
                            )}
                            {priceChanged && !isNew && (
                                <p className="text-sm text-green-700 font-bold mt-3 bg-green-200 p-2 rounded-lg">
                                    ✅ NOWE CENY!
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ceny PO (sizes) */}
                    {newData.sizes && (
                        <div
                            className={`${
                                priceChanged && !isNew
                                    ? "bg-green-100 p-4 rounded-lg border-4 border-green-500 shadow-xl"
                                    : ""
                            }`}
                        >
                            <p className="text-xs text-gray-600 font-semibold mb-1">
                                Rozmiary i ceny:
                            </p>
                            {newData.sizes.map((size, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between text-sm font-bold mb-1"
                                >
                                    <span className="text-gray-700">
                                        {size.dimension}:
                                    </span>
                                    <span className="text-green-700 text-lg">
                                        {size.prices} zł
                                    </span>
                                </div>
                            ))}
                            {priceChanged && !isNew && (
                                <p className="text-sm text-green-700 font-bold mt-3 bg-green-200 p-2 rounded-lg">
                                    ✅ NOWE ROZMIARY/CENY!
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
