"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ReportButton from "@/components/ReportButton";
import PriceSimulator from "@/components/PriceSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { normalizeToId } from "@/lib/utils";
import { useScrollToHash } from "@/hooks";
import type { BestMebleData, UniversalProduct } from "@/lib/types";

interface Props {
    data: BestMebleData;
    title?: string;
    priceFactor?: number;
}

// Product Card Component
function ProductCard({
    product,
    priceGroups,
    priceFactor = 1,
    producerName = "",
}: {
    product: UniversalProduct;
    priceGroups: string[];
    priceFactor?: number;
    producerName?: string;
}) {
    const name = product.MODEL || product.name || "Bez nazwy";
    const productId = `product-${normalizeToId(name)}`;

    // Oblicz cenę
    const calculatePrice = (basePrice: number): number => {
        let price = Math.round(basePrice * priceFactor);
        if (product.discount && product.discount > 0) {
            price = Math.round(price * (1 - product.discount / 100));
        }
        return price;
    };

    return (
        <Card id={productId} className="border-zinc-200 scroll-mt-24 relative">
            {product.discount && product.discount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 z-10 rounded-full text-sm font-bold px-2 py-1"
                >
                    -{product.discount}%
                </Badge>
            )}
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">{name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {/* Price groups */}
                <div className="space-y-2 mb-3">
                    {priceGroups.map((group) => {
                        const rawPrice =
                            (product.prices?.[group] as number) || 0;
                        const price = rawPrice ? calculatePrice(rawPrice) : 0;
                        const originalPrice =
                            product.discount && product.discount > 0
                                ? Math.round(rawPrice * priceFactor)
                                : undefined;

                        return (
                            <div
                                key={group}
                                className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm text-gray-600">
                                    {group}
                                </span>
                                <div className="flex items-center gap-2">
                                    {originalPrice && (
                                        <span className="text-xs text-gray-400 line-through">
                                            {originalPrice} zł
                                        </span>
                                    )}
                                    <span
                                        className={`font-semibold ${
                                            product.discount
                                                ? "text-red-600"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        {price ? `${price} zł` : "-"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
            {/* Ikony w prawym dolnym rogu */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {producerName && (
                    <ReportButton
                        producerName={producerName}
                        productName={name}
                    />
                )}
                {(product.previousName || priceFactor !== 1) && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="space-y-1">
                            {product.previousName && (
                                <p>Poprzednia nazwa: {product.previousName}</p>
                            )}
                            {priceFactor !== 1 && (
                                <p>Faktor: x{priceFactor.toFixed(2)}</p>
                            )}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </Card>
    );
}

export default function BestMebleLayout({
    data,
    title,
    priceFactor = 1,
}: Props) {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);
    const priceGroups = data.priceGroups || ["Cena"];

    // Jeśli symulacja aktywna, użyj jej zamiast bazowego faktora
    const factor = simulationFactor !== 1 ? simulationFactor : priceFactor;

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearch(urlSearch);
        }
    }, [searchParams]);

    // Filtruj produkty
    const products = useMemo(() => {
        const allProducts = data.products || [];
        const filtered = !search.trim()
            ? allProducts
            : allProducts.filter((p) => {
                  const name = (p.MODEL || p.name || "").toLowerCase();
                  const prevName = (p.previousName || "").toLowerCase();
                  const query = search.toLowerCase();
                  return name.includes(query) || prevName.includes(query);
              });
        return [...filtered].sort((a, b) => {
            const nameA = a.MODEL || a.name || "";
            const nameB = b.MODEL || b.name || "";
            return nameA.localeCompare(nameB, "pl");
        });
    }, [data.products, search]);

    // Scroll do elementu z hash po załadowaniu
    useScrollToHash();

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity">
            <PageHeader
                title={title}
                search={search}
                onSearchChange={setSearch}
            />

            <PriceSimulator
                currentFactor={simulationFactor}
                onFactorChange={setSimulationFactor}
            />

            <div className="max-w-7xl mx-auto mt-8 md:mt-12">
                {products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product, idx) => (
                            <ProductCard
                                key={idx}
                                product={product}
                                priceGroups={priceGroups}
                                priceFactor={factor}
                                producerName={title || "Best Meble"}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-lg mt-10">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}
