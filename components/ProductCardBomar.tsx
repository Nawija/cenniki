"use client";

import React from "react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { HelpCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { normalizeToId } from "@/lib/utils";
import {
    calculateProductPrice,
    calculateSurcharge,
    getEffectiveFactor,
    getEffectiveDiscount,
} from "@/lib/priceUtils";
import ReportButton from "@/components/ReportButton";
import type { ProductScheduledChangeServer } from "@/lib/scheduledChanges";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number | Record<string, number>>;
    sizes?: Array<{
        dimension: string;
        prices:
            | string
            | number
            | Record<string, string | number | Record<string, number>>;
    }>;
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
    priceFactor?: number; // Indywidualny mnożnik ceny produktu
    discount?: number; // Rabat procentowy z JSON
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

interface ProductCardProps {
    name: string;
    data: ProductData;
    category: string;
    overrides: Record<string, ProductOverride>;
    priceFactor?: number;
    surcharges?: Surcharge[];
    producerName?: string;
    scheduledChanges?: ProductScheduledChangeServer[];
}

function ProductCard({
    name,
    data,
    category,
    overrides,
    priceFactor = 1,
    surcharges = [],
    producerName = "",
    scheduledChanges = [],
}: ProductCardProps) {
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

    // Oblicz efektywny faktor i rabat raz (dla tooltipa i badge)
    const effectiveFactor = getEffectiveFactor(
        priceFactor,
        data.priceFactor ?? 1,
        override?.priceFactor ?? 1
    );
    const effectiveDiscount = getEffectiveDiscount(
        0,
        data.discount ?? 0,
        override?.discount
    );
    const hasDiscount = effectiveDiscount > 0;

    // Funkcja do obliczenia ceny - używa priceUtils
    const calcPrice = (basePrice: number) =>
        calculateProductPrice(basePrice, {
            globalFactor: priceFactor,
            productFactor: data.priceFactor,
            overrideFactor: override?.priceFactor,
            productDiscount: data.discount,
            overrideDiscount: override?.discount,
            customPrice: override?.customPrice,
        });

    // Nazwa do wyświetlenia
    const displayName = override?.customName || name;
    const displayImage = override?.customImage || data.image;
    const displayPreviousName =
        override?.customPreviousName || data.previousName;

    // Scheduled changes summary
    const hasScheduledChanges = scheduledChanges.length > 0;
    const averageChange = useMemo(() => {
        if (scheduledChanges.length === 0) return 0;
        const sum = scheduledChanges.reduce(
            (acc, c) => acc + c.percentChange,
            0
        );
        return Math.round((sum / scheduledChanges.length) * 10) / 10;
    }, [scheduledChanges]);

    const nextScheduledDate = useMemo(() => {
        if (scheduledChanges.length === 0) return null;
        const dates = scheduledChanges.map((c) => new Date(c.scheduledDate));
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        return minDate.toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "short",
        });
    }, [scheduledChanges]);

    return (
        <Card
            id={productId}
            className="hover:shadow-md transition-shadow relative overflow-hidden scroll-mt-24 pb-8"
        >
            {/* Żółta kropka - zaplanowane zmiany cen */}
            {hasScheduledChanges && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="absolute top-3 left-3 z-10 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-500 shadow-sm animate-pulse" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent
                        side="right"
                        className="bg-gray-900 text-white border-0 max-w-xs"
                    >
                        <div className="space-y-2 p-1">
                            <div className="flex items-center gap-2 font-medium">
                                <Calendar className="w-4 h-4 text-yellow-400" />
                                <span>Zaplanowana zmiana ceny</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {averageChange > 0 ? (
                                    <TrendingUp className="w-4 h-4 text-red-400" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-green-400" />
                                )}
                                <span
                                    className={
                                        averageChange > 0
                                            ? "text-red-400"
                                            : "text-green-400"
                                    }
                                >
                                    {averageChange > 0 ? "+" : ""}
                                    {averageChange}%
                                </span>
                                <span className="text-gray-400 text-sm">
                                    ({scheduledChanges.length}{" "}
                                    {scheduledChanges.length === 1
                                        ? "zmiana"
                                        : scheduledChanges.length < 5
                                        ? "zmiany"
                                        : "zmian"}
                                    )
                                </span>
                            </div>
                            {nextScheduledDate && (
                                <div className="text-sm text-gray-300">
                                    Od: {nextScheduledDate}
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )}

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
                            {effectiveFactor !== 1 && (
                                <p>
                                    Do ceny brutto: x
                                    {effectiveFactor.toFixed(2)}
                                </p>
                            )}
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

            <CardContent className="pt-6">
                <div className="flex justify-center mb-4 relative">
                    {/* Badge rabatu - identyczny jak w MpNidzica */}
                    {hasDiscount && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 left-1 z-10 w-12 h-12 rounded-full flex items-center justify-center -rotate-[18deg] text-sm font-black shadow-lg"
                        >
                            -{effectiveDiscount}%
                        </Badge>
                    )}
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
                        <div className="h-32 w-32 md:h-48 md:w-48 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs md:text-sm">
                                Brak zdjęcia
                            </span>
                        </div>
                    )}
                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2">
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
                                    // Sprawdź czy cena jest obiektem z wariantami
                                    if (
                                        typeof price === "object" &&
                                        price !== null
                                    ) {
                                        // Cena z wariantami materiałowymi
                                        return (
                                            <div
                                                key={group}
                                                className="odd:bg-gray-100/70 mb-2"
                                            >
                                                <div className="p-1 text-sm font-medium text-gray-700 bg-gray-50">
                                                    {group}:
                                                </div>
                                                {Object.entries(price).map(
                                                    ([
                                                        variant,
                                                        variantPrice,
                                                    ]) => {
                                                        const priceResult =
                                                            calcPrice(
                                                                variantPrice as number
                                                            );
                                                        return (
                                                            <div
                                                                key={`${group}-${variant}`}
                                                                className="flex justify-between p-1 pl-4 text-sm border-dotted border-b border-gray-200 hover:bg-blue-50"
                                                            >
                                                                <span className="text-gray-500 text-xs">
                                                                    {variant}:
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {priceResult.originalPrice && (
                                                                        <span className="text-xs text-gray-400 line-through">
                                                                            {
                                                                                priceResult.originalPrice
                                                                            }{" "}
                                                                            zł
                                                                        </span>
                                                                    )}
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
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        );
                                    }

                                    // Standardowa cena (liczba)
                                    const priceResult = calcPrice(
                                        price as number
                                    );

                                    return (
                                        <div
                                            key={group}
                                            className="odd:bg-gray-100/70"
                                        >
                                            <div className="flex justify-between p-1 text-sm border-dotted border-b-2 hover:bg-blue-50 border-gray-300">
                                                <span className="text-gray-600">
                                                    {group}:
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {priceResult.originalPrice && (
                                                        <span className="text-xs text-gray-400 line-through">
                                                            {
                                                                priceResult.originalPrice
                                                            }{" "}
                                                            zł
                                                        </span>
                                                    )}
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
                                                </div>
                                            </div>
                                            {/* Surcharges for this price group */}
                                            {surcharges.map(
                                                (surcharge, idx) => {
                                                    const surchargeResult =
                                                        calculateSurcharge(
                                                            priceResult.finalPrice,
                                                            priceResult.originalPrice,
                                                            surcharge.percent,
                                                            priceResult.hasDiscount
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
                                                            <div className="flex items-center gap-2">
                                                                {surchargeResult.originalSurchargePrice && (
                                                                    <span className="text-xs text-amber-800 line-through">
                                                                        {
                                                                            surchargeResult.originalSurchargePrice
                                                                        }{" "}
                                                                        zł
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`font-semibold text-xs ${
                                                                        priceResult.hasDiscount
                                                                            ? "text-red-600"
                                                                            : "text-amber-900"
                                                                    }`}
                                                                >
                                                                    {
                                                                        surchargeResult.surchargePrice
                                                                    }{" "}
                                                                    zł
                                                                </span>
                                                            </div>
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
                                            <div className="font-semibold text-gray-900 text-sm  bg-gray-100 px-2 py-1 rounded">
                                                {size.dimension}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 pt-1">
                                                {priceEntries.map(
                                                    ([variant, price]) => {
                                                        const priceResult =
                                                            calcPrice(price);
                                                        return (
                                                            <div
                                                                key={variant}
                                                                className="text-sm border-b border-dotted hover:bg-blue-50 flex justify-between border-gray-100 py-0.5 px-1"
                                                            >
                                                                <span className="text-gray-600 text-xs">
                                                                    {variant}:
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    {priceResult.originalPrice && (
                                                                        <span className="text-[10px] text-gray-400 line-through">
                                                                            {
                                                                                priceResult.originalPrice
                                                                            }
                                                                        </span>
                                                                    )}
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
                                    const priceResult = calcPrice(priceValue);

                                    return (
                                        <div key={i} className="mb-1">
                                            <div className="text-sm border-b border-dotted odd:bg-gray-50 hover:bg-blue-50 flex justify-between border-gray-200 py-1">
                                                <div className="font-semibold text-gray-900">
                                                    {size.dimension}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {priceResult.originalPrice && (
                                                        <span className="text-xs text-gray-400 line-through">
                                                            {
                                                                priceResult.originalPrice
                                                            }{" "}
                                                            zł
                                                        </span>
                                                    )}
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
                                                    // Cena surcharge od oryginalnej ceny (bez rabatu)
                                                    const originalSurchargePrice =
                                                        priceResult.originalPrice
                                                            ? Math.round(
                                                                  priceResult.originalPrice *
                                                                      (1 +
                                                                          surcharge.percent /
                                                                              100)
                                                              )
                                                            : null;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="text-sm bg-amber-50 hover:bg-blue-50 border-b border-dotted border-gray-200 flex justify-between py-1"
                                                        >
                                                            <span className="text-amber-700 font-semibold text-xs">
                                                                +{" "}
                                                                {
                                                                    surcharge.label
                                                                }
                                                                :
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {originalSurchargePrice && (
                                                                    <span className="text-xs text-amber-800 line-through">
                                                                        {
                                                                            originalSurchargePrice
                                                                        }{" "}
                                                                        zł
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`font-semibold text-xs ${
                                                                        priceResult.hasDiscount
                                                                            ? "text-red-600"
                                                                            : "text-amber-900"
                                                                    }`}
                                                                >
                                                                    {
                                                                        surchargePrice
                                                                    }{" "}
                                                                    zł
                                                                </span>
                                                            </div>
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

export default React.memo(ProductCard);
