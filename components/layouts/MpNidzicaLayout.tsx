"use client";

import Image from "next/image";
import { useState } from "react";
import { HelpCircle } from "lucide-react";
import ElementSelector from "@/components/ElementSelector";
import PageHeader from "@/components/PageHeader";
import ReportButton from "@/components/ReportButton";
import PriceSimulator from "@/components/PriceSimulator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { normalizeToId } from "@/lib/utils";
import { useScrollToHash } from "@/hooks";
import type { MpNidzicaData, MpNidzicaProduct, Surcharge } from "@/lib/types";

interface Props {
    data: MpNidzicaData;
    title: string | undefined;
    globalPriceFactor?: number;
}

export default function MpNidzicaLayout({
    data,
    title,
    globalPriceFactor = 1,
}: Props) {
    const products: MpNidzicaProduct[] = data.products || [];
    const surcharges: Surcharge[] = data.surcharges || [];
    const priceGroups: string[] = data.priceGroups || [];

    const [search, setSearch] = useState<string>("");
    const [simulationFactor, setSimulationFactor] = useState(1);

    const filteredProducts = products.filter((p) => {
        const query = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            (p.previousName && p.previousName.toLowerCase().includes(query))
        );
    });

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

            <div className="max-w-7xl w-full mx-auto py-6 md:py-10 px-3 md:px-6 ">
                {filteredProducts.length > 0 ? (
                    <div className="space-y-8 md:space-y-20">
                        {[...filteredProducts]
                            .sort((a, b) => a.name.localeCompare(b.name, "pl"))
                            .map((product, i) => (
                                <ProductSection
                                    key={i}
                                    product={product}
                                    surcharges={surcharges}
                                    priceFactor={
                                        simulationFactor !== 1
                                            ? simulationFactor
                                            : product.priceFactor ??
                                              globalPriceFactor
                                    }
                                    globalPriceGroups={priceGroups}
                                />
                            ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-base md:text-lg mt-10 md:mt-20">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>

            <ReportButton producerName={title || "MP Nidzica"} />
        </div>
    );
}

function ProductSection({
    product,
    surcharges,
    priceFactor = 1,
    globalPriceGroups = [],
}: {
    product: MpNidzicaProduct;
    surcharges: Surcharge[];
    priceFactor?: number;
    globalPriceGroups?: string[];
}) {
    const [imageLoading, setImageLoading] = useState(true);
    const [techImageLoading, setTechImageLoading] = useState(true);
    // Użyj globalnych grup, a jeśli brak to wykryj z pierwszego elementu (dla kompatybilności wstecznej)
    let elementGroups: string[] = globalPriceGroups;

    if (elementGroups.length === 0) {
        if (Array.isArray(product.elements)) {
            elementGroups = Object.keys(product.elements[0]?.prices || {});
        } else if (product.elements && typeof product.elements === "object") {
            elementGroups = Object.keys(
                Object.values(product.elements)[0]?.prices || {}
            );
        }
    }

    const productId = `product-${normalizeToId(product.name)}`;

    return (
        <Card
            id={productId}
            className="p-4 md:p-8 relative overflow-hidden border-0 shadow-md md:shadow-lg scroll-mt-24"
        >
            <CardContent className="p-0">
                {/* HEADER: Nazwa + Zdjęcie */}
                <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
                    {/* IMAGE */}
                    <div className="flex justify-center md:justify-start relative">
                        {product.discount && product.discount > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 -left-1 z-10 w-12 h-12 rounded-full flex items-center justify-center -rotate-[18deg] text-sm font-black"
                            >
                                -{product.discount}%
                            </Badge>
                        )}
                        {product.image ? (
                            <div className="relative">
                                {imageLoading && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded-lg" />
                                )}
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    width={400}
                                    height={400}
                                    className="object-contain max-h-48 md:h-64 w-auto"
                                    onLoad={() => setImageLoading(false)}
                                />
                            </div>
                        ) : (
                            <div className="h-32 md:h-44 w-full max-w-96 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                                Brak zdjęcia
                            </div>
                        )}
                    </div>

                    {/* TITLE */}
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center justify-center md:justify-end gap-2 mb-2 md:mb-6">
                            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-orange-800 text-center md:text-end">
                                {product.name}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* ELEMENT SELECTOR */}
                {product.elements && (
                    <ElementSelector
                        elements={
                            product.elements as unknown as Record<string, any>
                        }
                        groups={elementGroups}
                        discount={product.discount}
                        priceFactor={priceFactor}
                    />
                )}

                {/* SURCHARGES */}
                {surcharges.length > 0 && (
                    <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Dopłaty:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {surcharges.map((s, idx) => (
                                <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5"
                                >
                                    {s.label}: +{s.percent}%
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* TECHNICAL IMAGE */}
                {product.technicalImage && (
                    <div className="relative h-48 md:h-96 rounded-lg overflow-hidden mt-6 md:mt-12 bg-gray-50">
                        {techImageLoading && (
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
                        )}
                        <Image
                            src={product.technicalImage}
                            alt="technical"
                            fill
                            className="object-contain"
                            onLoad={() => setTechImageLoading(false)}
                        />
                    </div>
                )}
            </CardContent>
            {(product.previousName || priceFactor !== 1) && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="text-gray-400 absolute bottom-2 right-2 hover:text-gray-600 transition-colors">
                            <HelpCircle className="w-5 h-5" />
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
        </Card>
    );
}
