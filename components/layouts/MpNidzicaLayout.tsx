"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import ElementSelector from "@/components/ElementSelector";
import PageHeader from "@/components/PageHeader";
import ReportButton from "@/components/ReportButton";
import PriceSimulator from "@/components/PriceSimulator";
import { FabricButton } from "@/components/FabricButton";
import { ProductInfoTooltip } from "@/components/ProductInfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTooltip } from "@/components/ui";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { normalizeToId } from "@/lib/utils";
import { useLayoutBase } from "@/hooks";
import type {
    ProductScheduledChangeServer,
    ScheduledFactorChange,
} from "@/lib/scheduledChanges";
import type {
    MpNidzicaData,
    MpNidzicaProduct,
    Surcharge,
    FabricPdf,
} from "@/lib/types";

interface Props {
    data: MpNidzicaData;
    title: string | undefined;
    globalPriceFactor?: number;
    showVisualizer?: boolean;
    producerSlug?: string; // opcjonalnie przekazany slug
    producerName?: string; // nazwa producenta do wyświetlenia
    scheduledChangesMap?: Record<string, ProductScheduledChangeServer[]>; // przekazane z Server Component
    scheduledFactorChange?: ScheduledFactorChange | null; // zaplanowana zmiana faktora
    fabrics?: FabricPdf[];
}

export default function MpNidzicaLayout({
    data,
    title,
    globalPriceFactor = 1,
    showVisualizer = false,
    producerSlug: propSlug,
    producerName,
    scheduledChangesMap = {},
    scheduledFactorChange = null,
    fabrics = [],
}: Props) {
    const {
        search,
        setSearch,
        simulationFactor,
        setSimulationFactor,
        getProductChanges,
    } = useLayoutBase({ propSlug, scheduledChangesMap });

    const products: MpNidzicaProduct[] = data.products || [];
    const surcharges: Surcharge[] = data.surcharges || [];
    const priceGroups: string[] = data.priceGroups || [];
    const categoryPriceGroups: Record<string, string[]> =
        (data as any).categoryPriceGroups || {};

    const filteredProducts = products.filter((p) => {
        const query = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            (p.previousName && p.previousName.toLowerCase().includes(query))
        );
    });

    // Funkcja do pobierania grup cenowych dla produktu
    const getPriceGroupsForProduct = (product: MpNidzicaProduct): string[] => {
        const category = (product as any).category;
        if (category && categoryPriceGroups[category]) {
            return categoryPriceGroups[category];
        }
        return priceGroups;
    };

    // Pobierz kategorie produktów z danych
    const productCategories: string[] = (data as any).productCategories || [];

    // Sortuj produkty: najpierw po kategorii, potem alfabetycznie
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        // Jeśli są kategorie, sortuj po nich
        if (productCategories.length > 0) {
            const catA = (a as any).category || "";
            const catB = (b as any).category || "";
            const indexA = catA ? productCategories.indexOf(catA) : 999;
            const indexB = catB ? productCategories.indexOf(catB) : 999;
            const orderA = indexA === -1 ? 998 : indexA;
            const orderB = indexB === -1 ? 998 : indexB;
            if (orderA !== orderB) return orderA - orderB;
        }
        // W ramach tej samej kategorii - alfabetycznie
        return a.name.localeCompare(b.name, "pl");
    });

    return (
        <div className="min-h-screen p-3 sm:p-4 md:p-6 anim-opacity">
            <PageHeader
                title={title}
                search={search}
                onSearchChange={setSearch}
            />

            <PriceSimulator
                currentFactor={simulationFactor}
                onFactorChange={setSimulationFactor}
                producerName={producerName}
                baseFactor={globalPriceFactor}
            />

            <div className="max-w-7xl w-full mx-auto py-4 md:py-10 px-0 md:px-6">
                {sortedProducts.length > 0 ? (
                    <div className="space-y-8 md:space-y-20">
                        {sortedProducts.map((product, i) => {
                            const currentCategory =
                                (product as any).category || null;
                            const prevProduct =
                                i > 0 ? sortedProducts[i - 1] : null;
                            const prevCategory = prevProduct
                                ? (prevProduct as any).category || null
                                : null;
                            const showCategoryHeader =
                                productCategories.length > 0 &&
                                currentCategory !== prevCategory;

                            return (
                                <div key={i}>
                                    {/* Nagłówek kategorii */}
                                    {showCategoryHeader && (
                                        <div className="flex items-center gap-4 mb-8 mt-4 first:mt-0">
                                            <h2 className="text-xl md:text-2xl font-semibold text-gray-500 capitalize">
                                                {currentCategory || "Inne"}:
                                            </h2>
                                        </div>
                                    )}
                                    <ProductSection
                                        product={product}
                                        surcharges={surcharges}
                                        priceFactor={
                                            simulationFactor !== 1
                                                ? simulationFactor
                                                : product.priceFactor ??
                                                  globalPriceFactor
                                        }
                                        globalPriceGroups={getPriceGroupsForProduct(
                                            product
                                        )}
                                        producerName={title || "MP Nidzica"}
                                        scheduledChanges={getProductChanges(
                                            product.name
                                        )}
                                        scheduledFactorChange={
                                            scheduledFactorChange
                                        }
                                        showVisualizer={showVisualizer}
                                        fabrics={fabrics}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-base md:text-lg mt-10 md:mt-20">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}

function ProductSection({
    product,
    surcharges,
    priceFactor = 1,
    globalPriceGroups = [],
    producerName = "",
    scheduledChanges = [],
    scheduledFactorChange = null,
    showVisualizer = false,
    fabrics = [],
}: {
    product: MpNidzicaProduct;
    surcharges: Surcharge[];
    priceFactor?: number;
    globalPriceGroups?: string[];
    producerName?: string;
    scheduledChanges?: ProductScheduledChangeServer[];
    scheduledFactorChange?: ScheduledFactorChange | null;
    showVisualizer?: boolean;
    fabrics?: FabricPdf[];
}) {
    const [imageLoading, setImageLoading] = useState(true);
    const [techImageLoading, setTechImageLoading] = useState(true);

    // Scheduled factor change info
    const hasFactorChange = scheduledFactorChange !== null;
    const factorChangeDate = hasFactorChange
        ? new Date(scheduledFactorChange.scheduledDate).toLocaleDateString(
              "pl-PL",
              {
                  day: "numeric",
                  month: "short",
              }
          )
        : null;

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

    // Użyj globalnych grup, a jeśli brak to wykryj z pierwszego elementu (dla kompatybilności wstecznej)
    let elementGroups: string[] = globalPriceGroups;

    if (elementGroups.length === 0) {
        if (Array.isArray(product.elements)) {
            const firstElement = product.elements[0] as
                | { prices?: Record<string, number> }
                | undefined;
            elementGroups = Object.keys(firstElement?.prices || {});
        } else if (product.elements && typeof product.elements === "object") {
            const firstElement = Object.values(product.elements)[0] as
                | { prices?: Record<string, number> }
                | undefined;
            elementGroups = Object.keys(firstElement?.prices || {});
        }
    }

    const productId = `product-${normalizeToId(product.name)}`;

    return (
        <Card
            id={productId}
            className=" md:p-8 relative overflow-hidden border-0 shadow-md md:shadow-lg scroll-mt-24"
        >
            {/* Przycisk Tkaniny - prawy górny róg */}
            {fabrics.length > 0 && (
                <div className="absolute top-3 right-3 z-10">
                    <FabricButton
                        fabrics={fabrics}
                        variant="icon"
                        className="h-8 w-8 p-0"
                    />
                </div>
            )}

            {/* Żółta kropka - zaplanowana zmiana faktora */}
            {hasFactorChange && !hasScheduledChanges && (
                <div className="absolute top-3 left-3 z-10">
                    <ResponsiveTooltip
                        title={
                            scheduledFactorChange.percentChange > 0
                                ? "Podwyżka"
                                : "Obniżka"
                        }
                        side="right"
                        className="bg-gray-900 text-white border-0 max-w-xs"
                        content={
                            <div className="space-y-1 p-1">
                                <div className="flex items-center gap-2 font-medium">
                                    {scheduledFactorChange.percentChange > 0 ? (
                                        <TrendingUp className="w-4 h-4 text-red-400" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-green-400" />
                                    )}
                                    <span
                                        className={
                                            scheduledFactorChange.percentChange >
                                            0
                                                ? "text-red-400"
                                                : "text-green-400"
                                        }
                                    >
                                        {scheduledFactorChange.percentChange > 0
                                            ? "Podwyżka"
                                            : "Obniżka"}{" "}
                                        {scheduledFactorChange.percentChange > 0
                                            ? "+"
                                            : ""}
                                        {scheduledFactorChange.percentChange}%
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    Od: {factorChangeDate}
                                </div>
                            </div>
                        }
                    >
                        <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-500 shadow-sm animate-pulse" />
                    </ResponsiveTooltip>
                </div>
            )}

            {/* Żółta kropka - zaplanowane zmiany cen */}
            {hasScheduledChanges && (
                <div className="absolute top-3 left-3 z-10">
                    <ResponsiveTooltip
                        title="Zaplanowana zmiana ceny"
                        side="right"
                        className="bg-gray-900 text-white border-0 max-w-xs"
                        content={
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
                                    <span className="text-gray-600 text-sm">
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
                                    <div className="text-sm text-gray-600">
                                        Od: {nextScheduledDate}
                                    </div>
                                )}
                            </div>
                        }
                    >
                        <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-500 shadow-sm animate-pulse" />
                    </ResponsiveTooltip>
                </div>
            )}

            <CardContent className="p-0">
                {/* HEADER: Nazwa + Zdjęcie */}
                <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
                    {/* IMAGE */}
                    <div className="flex justify-center md:justify-start relative">
                        {product.discount && product.discount > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 left-1 z-10 w-12 h-12 rounded-full flex items-center justify-center -rotate-[18deg] text-sm font-black"
                            >
                                -{product.discount}%
                            </Badge>
                        )}
                        {product.image ? (
                            <div className="relative rounded-lg max-h-48 md:h-52 overflow-hidden mx-2">
                                {imageLoading && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-gray-transparent animate-shimmer rounded-md" />
                                )}
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    width={500}
                                    height={500}
                                    className="object-contain max-h-48 md:h-52 w-auto"
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
                            <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-extrabold text-orange-800 text-center md:text-end break-words">
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
                        showVisualizer={showVisualizer}
                    />
                )}

                {/* OPIS PRODUKTU - ACCORDION */}
                {product.description && (
                    <div className="p-3 border-t border-gray-100">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="spec" className="border-0">
                                <AccordionTrigger className="py-2 hover:no-underline">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Specyfikacja
                                    </h4>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                        {product.description}
                                    </p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}

                {/* SURCHARGES */}
                {surcharges.length > 0 && (
                    <div className="p-3 pt-4 border-t border-gray-100">
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

                {/* TECHNICAL IMAGE - ACCORDION */}
                {product.technicalImage && (
                    <div className="p-3">
                        <Accordion type="single" collapsible>
                            <AccordionItem
                                value="technical"
                                className="border-0"
                            >
                                <AccordionTrigger className="py-2 hover:no-underline">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Rysunek techniczny
                                    </h4>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="relative h-48 md:h-96 rounded-lg overflow-hidden bg-gray-50">
                                        {techImageLoading && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
                                        )}
                                        <Image
                                            src={product.technicalImage}
                                            alt="technical"
                                            fill
                                            className="object-contain"
                                            onLoad={() =>
                                                setTechImageLoading(false)
                                            }
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}
            </CardContent>
            {/* Ikony w prawym dolnym rogu */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {producerName && (
                    <ReportButton
                        producerName={producerName}
                        productName={product.name}
                    />
                )}
                <ProductInfoTooltip
                    previousName={product.previousName}
                    priceFactor={priceFactor}
                    size="sm"
                />
            </div>
        </Card>
    );
}
