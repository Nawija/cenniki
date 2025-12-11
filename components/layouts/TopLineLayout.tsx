"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import type { TopLineData, TopLineProductData, Surcharge } from "@/lib/types";

interface Props {
    data: TopLineData;
    title?: string;
    priceFactor?: number;
}

function ProductCard({
    name,
    data,
    priceFactor = 1,
    surcharges = [],
}: {
    name: string;
    data: TopLineProductData;
    priceFactor?: number;
    surcharges?: Surcharge[];
}) {
    // Oblicz cenę z rabatem
    const calculatePrice = (): {
        finalPrice: number;
        originalPrice?: number;
        hasDiscount: boolean;
    } => {
        if (!data.price) {
            return { finalPrice: 0, hasDiscount: false };
        }

        const basePrice = Math.round(data.price * priceFactor);

        if (data.discount && data.discount > 0) {
            const discountedPrice = Math.round(
                basePrice * (1 - data.discount / 100)
            );
            return {
                finalPrice: discountedPrice,
                originalPrice: basePrice,
                hasDiscount: true,
            };
        }

        return { finalPrice: basePrice, hasDiscount: false };
    };

    const priceResult = calculatePrice();
    const hasDiscount = data.discount && data.discount > 0;

    // Podziel wymiary na linie (każda linia = osobny podpunkt)
    const dimensionLines = data.dimensions
        ? data.dimensions.split("\n").filter((line) => line.trim())
        : [];

    return (
        <Card className="hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Tooltip z informacjami: previousName i priceFactor */}
            {(data.previousName || priceFactor !== 1) && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="absolute bottom-2 right-2 text-gray-400 hover:text-gray-600 transition-colors">
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

            {/* Badge rabatu */}
            {hasDiscount && (
                <Badge
                    variant="destructive"
                    className="absolute left-2 md:left-4 top-2 md:top-4 shadow-lg"
                >
                    {data.discountLabel} -{data.discount}%
                </Badge>
            )}

            <CardContent className="pt-6">
                {/* Zdjęcie */}
                <div className="flex justify-center mb-4">
                    {data.image ? (
                        <Image
                            src={data.image}
                            alt={name}
                            height={300}
                            width={400}
                            className="w-full h-64 object-contain"
                        />
                    ) : (
                        <div className="h-32 w-full md:h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs md:text-sm">
                                Brak zdjęcia
                            </span>
                        </div>
                    )}
                </div>

                {/* Nazwa produktu */}
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                    {name}
                </h3>

                {/* Cena */}
                {data.price && data.price > 0 && (
                    <>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">
                                Cena brutto:
                            </span>
                            <div className="flex flex-col items-end">
                                <span
                                    className={`text-lg font-bold ${
                                        priceResult.hasDiscount
                                            ? "text-red-600"
                                            : "text-gray-900"
                                    }`}
                                >
                                    {priceResult.finalPrice} zł
                                </span>
                                {priceResult.originalPrice && (
                                    <span className="text-sm text-gray-400 line-through">
                                        {priceResult.originalPrice} zł
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Surcharges */}
                        {surcharges.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {surcharges.map((surcharge, idx) => {
                                    const surchargePrice = Math.round(
                                        priceResult.finalPrice *
                                            (1 + surcharge.percent / 100)
                                    );
                                    return (
                                        <div
                                            key={idx}
                                            className="text-sm bg-amber-50 hover:bg-blue-50 border-b border-dotted border-gray-100 flex justify-between py-1 px-2 rounded"
                                        >
                                            <span className="text-amber-700 font-semibold text-xs">
                                                + {surcharge.label}:
                                            </span>
                                            <span className="text-amber-900 font-semibold text-xs">
                                                {surchargePrice} zł
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Wymiary jako podpunkty */}
                {dimensionLines.length > 0 && (
                    <>
                        <Separator className="my-4" />
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Wymiary:
                        </p>
                        <ul className="space-y-1">
                            {dimensionLines.map((line, i) => (
                                <li
                                    key={i}
                                    className="text-sm text-gray-600 leading-relaxed flex items-start"
                                >
                                    <span className="text-blue-500 mr-2">
                                        •
                                    </span>
                                    {line.trim()}
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {/* Opis */}
                {data.description && (
                    <>
                        <Separator className="my-4" />
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Opis:
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {data.description}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function TopLineLayout({ data, title, priceFactor = 1 }: Props) {
    const [search, setSearch] = useState("");

    // Filtruj kategorie i produkty po nazwie lub previousName
    const filteredCategories = useMemo(() => {
        if (!search.trim()) return data.categories || {};

        const query = search.toLowerCase();
        const result: Record<string, Record<string, TopLineProductData>> = {};

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
                        // Użyj mnożnika kategorii jeśli istnieje, w przeciwnym razie globalny priceFactor
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

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(products).map(
                                        ([productName, productData], idx) => (
                                            <ProductCard
                                                key={productName + idx}
                                                name={productName}
                                                data={productData}
                                                priceFactor={categoryFactor}
                                                surcharges={categorySurcharges}
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
                    Brak produktów pasujących do wyszukiwania.
                </p>
            )}
        </div>
    );
}
