"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { normalizeToId } from "@/lib/utils";
import ReportButton from "@/components/ReportButton";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: Array<{
        dimension: string;
        prices: string | number | Record<string, string | number>;
    }>;
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

interface Surcharge {
    label: string;
    percent: number;
}

export default function ProductCard({
    name,
    data,
    category,
    overrides,
    priceFactor = 1,
    surcharges = [],
    producerName = "",
}: {
    name: string;
    data: ProductData;
    category: string;
    overrides: Record<string, ProductOverride>;
    priceFactor?: number;
    surcharges?: Surcharge[];
    producerName?: string;
}) {
    const [imageLoading, setImageLoading] = useState(true);
    const productId = `product-${normalizeToId(name)}`;
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

        // W przeciwnym razie użyj największego faktora spośród: globalny, produktu, override
        const productFactor = data.priceFactor ?? 1.0;
        const overrideFactor = override?.priceFactor || 1.0;
        // Używamy tylko najwyższego faktora (nie mnożymy)
        const effectiveFactor = Math.max(
            priceFactor,
            productFactor,
            overrideFactor
        );
        const priceWithFactor = Math.round(basePrice * effectiveFactor);

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
        <Card
            id={productId}
            className="hover:shadow-md transition-shadow relative overflow-hidden scroll-mt-24"
        >
            {/* Ikony w prawym dolnym rogu */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {producerName && (
                    <ReportButton
                        producerName={producerName}
                        productName={displayName}
                    />
                )}
                {(displayPreviousName ||
                    priceFactor !== 1 ||
                    (data.priceFactor && data.priceFactor !== 1)) && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="space-y-1">
                            {displayPreviousName && (
                                <p>Poprzednia nazwa: {displayPreviousName}</p>
                            )}
                            {(() => {
                                const productFactor = data.priceFactor ?? 1.0;
                                const overrideFactor =
                                    override?.priceFactor || 1.0;
                                const effectiveFactor = Math.max(
                                    priceFactor,
                                    productFactor,
                                    overrideFactor
                                );
                                return effectiveFactor !== 1 ? (
                                    <p>
                                        Do ceny brutto: x
                                        {effectiveFactor.toFixed(2)}
                                    </p>
                                ) : null;
                            })()}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            {data.notes && (
                <Badge
                    variant="destructive"
                    className="absolute right-2 md:right-4 top-2 md:top-4"
                >
                    {data.notes}
                </Badge>
            )}
            {hasDiscount && (
                <Badge
                    variant="destructive"
                    className="absolute left-2 md:left-4 top-2 md:top-4 shadow-lg"
                >
                    PROMOCJA -{override.discount}%
                </Badge>
            )}

            <CardContent className="pt-6">
                <div className="flex justify-center mb-4">
                    {displayImage ? (
                        <div className="relative">
                            {imageLoading && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded-lg" />
                            )}
                            <Image
                                src={displayImage}
                                alt=""
                                height={200}
                                width={200}
                                className="h-32 w-32 md:h-48 md:w-48 object-contain"
                                onLoad={() => setImageLoading(false)}
                            />
                        </div>
                    ) : (
                        <div className="h-32 w-32 md:h-48 md:w-48 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs md:text-sm">
                                Brak zdjęcia
                            </span>
                        </div>
                    )}
                </div>

                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                    {displayName}
                </h3>

                {override?.customName && (
                    <p className="text-xs text-gray-500 mb-2">
                        Oryginalna: {name}
                    </p>
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
                    <>
                        <Separator className="my-4" />
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Ceny brutto:
                        </p>
                        <div>
                            {Object.entries(data.prices).map(
                                ([group, price]) => {
                                    const priceResult = calculatePrice(price);

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
                                                        {priceResult.finalPrice}{" "}
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
                                            {/* Surcharges for this price group */}
                                            {surcharges.map(
                                                (surcharge, idx) => {
                                                    const surchargePrice =
                                                        Math.round(
                                                            priceResult.finalPrice *
                                                                (1 +
                                                                    surcharge.percent /
                                                                        100)
                                                        );
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="text-sm bg-amber-50 hover:bg-blue-50 border-b border-dotted border-gray-100 flex justify-between py-0.5 px-1"
                                                        >
                                                            <span className="text-amber-700 font-semibold text-xs">
                                                                +{" "}
                                                                {
                                                                    surcharge.label
                                                                }
                                                                :
                                                            </span>
                                                            <span className="text-amber-900 font-semibold text-xs">
                                                                {surchargePrice}{" "}
                                                                zł
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </>
                )}

                {/* ROZMIARY I CENY (stoły) */}
                {data.sizes && data.sizes.length > 0 && (
                    <>
                        <Separator className="my-4" />
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Dostępne wymiary i ceny brutto:
                        </p>
                        <div>
                            {data.sizes.map((size, i) => {
                                // Sprawdź czy prices jest obiektem (wiele cen) czy pojedynczą wartością
                                const isMultiplePrices =
                                    typeof size.prices === "object" &&
                                    size.prices !== null &&
                                    !Array.isArray(size.prices);

                                if (isMultiplePrices) {
                                    // Wiele cen (warianty materiałowe)
                                    const priceEntries = Object.entries(
                                        size.prices as Record<string, number>
                                    );
                                    return (
                                        <div key={i} className="mb-3">
                                            <div className="font-semibold text-gray-900 text-sm mb-1 bg-gray-50 px-2 py-1 rounded">
                                                {size.dimension}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 pl-2">
                                                {priceEntries.map(
                                                    ([variant, price]) => {
                                                        const priceResult =
                                                            calculatePrice(
                                                                price
                                                            );
                                                        return (
                                                            <div
                                                                key={variant}
                                                                className="text-sm border-b border-dotted hover:bg-blue-50 flex justify-between border-gray-100 py-0.5 px-1"
                                                            >
                                                                <span className="text-gray-600 text-xs">
                                                                    {variant}:
                                                                </span>
                                                                <div className="flex flex-col items-end">
                                                                    <span
                                                                        className={`text-xs font-semibold ${
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
                                    );
                                } else {
                                    // Pojedyncza cena (stary format)
                                    const priceValue =
                                        typeof size.prices === "string"
                                            ? parseInt(
                                                  size.prices.replace(/\s/g, "")
                                              )
                                            : (size.prices as number);
                                    const priceResult =
                                        calculatePrice(priceValue);

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
                                                        {priceResult.finalPrice}{" "}
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
                                            {/* Surcharges for this size */}
                                            {surcharges.map(
                                                (surcharge, idx) => {
                                                    const surchargePrice =
                                                        Math.round(
                                                            priceResult.finalPrice *
                                                                (1 +
                                                                    surcharge.percent /
                                                                        100)
                                                        );
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="text-sm bg-amber-50 hover:bg-blue-50 border-b border-dotted border-gray-100 flex justify-between py-1"
                                                        >
                                                            <span className="text-amber-700 font-semibold text-xs">
                                                                +{" "}
                                                                {
                                                                    surcharge.label
                                                                }
                                                                :
                                                            </span>
                                                            <span className="text-amber-900 font-semibold text-xs">
                                                                {surchargePrice}{" "}
                                                                zł
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </>
                )}

                {/* OPCJE */}
                {data.options && data.options.length > 0 && (
                    <>
                        <Separator className="my-4" />
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
                    </>
                )}

                {/* OPIS */}
                {data.description && data.description.length > 0 && (
                    <>
                        <Separator className="my-4" />
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
                    </>
                )}
            </CardContent>
        </Card>
    );
}
