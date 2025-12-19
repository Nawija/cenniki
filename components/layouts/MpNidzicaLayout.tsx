"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { HelpCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import ElementSelector from "@/components/ElementSelector";
import PageHeader from "@/components/PageHeader";
import ReportButton from "@/components/ReportButton";
import PriceSimulator from "@/components/PriceSimulator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { normalizeToId } from "@/lib/utils";
import { useScrollToHash, useScheduledChanges } from "@/hooks";
import type { ProductScheduledChange } from "@/hooks";
import type { MpNidzicaData, MpNidzicaProduct, Surcharge } from "@/lib/types";

interface Props {
    data: MpNidzicaData;
    title: string | undefined;
    globalPriceFactor?: number;
    showVisualizer?: boolean;
    producerSlug?: string; // opcjonalnie przekazany slug
}

export default function MpNidzicaLayout({
    data,
    title,
    globalPriceFactor = 1,
    showVisualizer = false,
    producerSlug: propSlug,
}: Props) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const products: MpNidzicaProduct[] = data.products || [];
    const surcharges: Surcharge[] = data.surcharges || [];
    const priceGroups: string[] = data.priceGroups || [];
    const categoryPriceGroups: Record<string, string[]> =
        (data as any).categoryPriceGroups || {};

    const [search, setSearch] = useState<string>("");
    const [simulationFactor, setSimulationFactor] = useState(1);

    // Użyj przekazanego sluga lub wyciągnij z pathname (/p/mp-nidzica -> mp-nidzica)
    const producerSlug = useMemo(() => {
        if (propSlug) return propSlug;
        const match = pathname.match(/\/p\/([^/]+)/);
        return match ? match[1] : "";
    }, [propSlug, pathname]);

    // Pobierz zaplanowane zmiany cen
    const { getProductChanges } = useScheduledChanges(producerSlug);

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearch(urlSearch);
        }
    }, [searchParams]);

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

    // Scroll do elementu z hash po załadowaniu
    useScrollToHash();

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

            <div className="max-w-7xl w-full mx-auto py-6 md:py-10 px-0 md:px-6 ">
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
                                        showVisualizer={showVisualizer}
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
    showVisualizer = false,
}: {
    product: MpNidzicaProduct;
    surcharges: Surcharge[];
    priceFactor?: number;
    globalPriceGroups?: string[];
    producerName?: string;
    scheduledChanges?: ProductScheduledChange[];
    showVisualizer?: boolean;
}) {
    const [imageLoading, setImageLoading] = useState(true);
    const [techImageLoading, setTechImageLoading] = useState(true);

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
                            <div className="relative rounded-lg overflow-hidden bg-gray-50 mx-2">
                                {imageLoading && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded-lg" />
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
                        showVisualizer={showVisualizer}
                    />
                )}

                {/* OPIS PRODUKTU - ACCORDION */}
                {product.description && (
                    <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
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
            {/* Ikony w prawym dolnym rogu */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {producerName && (
                    <ReportButton
                        producerName={producerName}
                        productName={product.name}
                    />
                )}
                {(product.previousName || priceFactor !== 1) && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
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
            </div>
        </Card>
    );
}
