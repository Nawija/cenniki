"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { HelpCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ReportButton from "@/components/ReportButton";
import PriceSimulator from "@/components/PriceSimulator";
import ElementSelector from "@/components/ElementSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { useScrollToHash } from "@/hooks";
import type { PuszmanData, PuszmanProduct, Surcharge } from "@/lib/types";
import type { ProductScheduledChangeServer } from "@/lib/scheduledChanges";

interface Props {
    data: PuszmanData;
    title?: string;
    priceGroups?: string[];
    priceFactor?: number;
    producerSlug?: string; // opcjonalnie przekazany slug
    scheduledChangesMap?: Record<string, ProductScheduledChangeServer[]>; // przekazane z Server Component
}

const DEFAULT_GROUPS = [
    "grupa I",
    "grupa II",
    "grupa III",
    "grupa IV",
    "grupa V",
    "grupa VI",
];

export default function PuszmanLayout({
    data,
    title,
    priceGroups,
    priceFactor = 1,
    producerSlug: propSlug,
    scheduledChangesMap = {},
}: Props) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);
    const groupNames = priceGroups || DEFAULT_GROUPS;
    const surcharges: Surcharge[] = data.surcharges || [];
    // Jeśli symulacja aktywna, użyj jej zamiast bazowego faktora
    const baseFactor = data.priceFactor ?? priceFactor;
    const factor = simulationFactor !== 1 ? simulationFactor : baseFactor;

    // Użyj przekazanego sluga lub wyciągnij z pathname (/p/puszman -> puszman)
    const producerSlug = useMemo(() => {
        if (propSlug) return propSlug;
        const match = pathname.match(/\/p\/([^/]+)/);
        return match ? match[1] : "";
    }, [propSlug, pathname]);

    // Funkcja do pobierania zaplanowanych zmian dla produktu (z przekazanej mapy)
    const getProductChanges = useCallback(
        (productName: string, category?: string) => {
            const key = category ? `${category}__${productName}` : productName;
            return scheduledChangesMap[key] || [];
        },
        [scheduledChangesMap]
    );

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearch(urlSearch);
        }
    }, [searchParams]);

    const allProducts: PuszmanProduct[] = (data.Arkusz1 || []).filter(
        (item) => item && item.MODEL && typeof item.MODEL === "string"
    );

    // Filtruj produkty po nazwie modelu lub poprzedniej nazwie
    const products = useMemo(() => {
        const filtered = !search.trim()
            ? allProducts
            : allProducts.filter(
                  (p) =>
                      p.MODEL.toLowerCase().includes(search.toLowerCase()) ||
                      (p.previousName &&
                          p.previousName
                              .toLowerCase()
                              .includes(search.toLowerCase()))
              );
        return [...filtered].sort((a, b) =>
            a.MODEL.localeCompare(b.MODEL, "pl")
        );
    }, [allProducts, search]);

    // Przekształć produkty Puszman na format ElementSelector
    const elementsForSelector = useMemo(() => {
        const elements: Record<string, any> = {};
        products.forEach((product) => {
            const prices: Record<string, number> = {};
            groupNames.forEach((group) => {
                const price = product[group] as number | undefined;
                if (price) prices[group] = price;
            });

            elements[product.MODEL] = {
                code: product.MODEL,
                prices,
                // Dodatkowe dane
                legColor: product["KOLOR NOGI"],
                previousName: product.previousName,
            };
        });
        return elements;
    }, [products, groupNames]);

    // Scroll do elementu z hash po załadowaniu
    useScrollToHash();

    // Extra headers dla ElementSelector
    const extraHeaders = (
        <>
            <th className="px-2 md:px-4 py-2 md:py-2.5 text-center text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Kolor nogi
            </th>
            <th className="px-1 md:px-2 py-2 md:py-2.5 w-[40px] md:w-[60px]"></th>
        </>
    );

    // Render extra columns dla ElementSelector
    const renderExtraColumns = (elData: any) => {
        const legColor = elData.legColor;
        const hasLegColor = legColor && legColor.toLowerCase() !== "x";
        const productChanges = getProductChanges(elData.code);
        const hasScheduledChanges = productChanges.length > 0;
        const averageChange =
            productChanges.length > 0
                ? Math.round(
                      (productChanges.reduce(
                          (acc, c) => acc + c.percentChange,
                          0
                      ) /
                          productChanges.length) *
                          10
                  ) / 10
                : 0;
        const nextScheduledDate =
            productChanges.length > 0
                ? new Date(
                      Math.min(
                          ...productChanges.map((c) =>
                              new Date(c.scheduledDate).getTime()
                          )
                      )
                  ).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                  })
                : null;

        return (
            <>
                <td className="px-2 md:px-4 py-2 md:py-2.5 text-center">
                    {hasLegColor ? (
                        <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 text-[10px] md:text-xs"
                        >
                            {legColor}
                        </Badge>
                    ) : (
                        <span className="text-gray-400 text-xs md:text-sm">
                            -
                        </span>
                    )}
                </td>
                <td className="px-1 md:px-2 py-2 md:py-2.5">
                    <div className="flex items-center gap-1">
                        {/* Żółta kropka - zaplanowane zmiany */}
                        {hasScheduledChanges && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-pointer">
                                        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500 shadow-sm animate-pulse" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="left"
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
                        <ReportButton
                            producerName={title || "Puszman"}
                            productName={elData.code}
                        />
                        {(elData.previousName || factor !== 1) && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="space-y-1">
                                    {elData.previousName && (
                                        <p>
                                            Poprzednia nazwa:{" "}
                                            {elData.previousName}
                                        </p>
                                    )}
                                    {factor !== 1 && (
                                        <p>Faktor: x{factor.toFixed(2)}</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </td>
            </>
        );
    };

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
            />

            {/* SURCHARGES */}
            {surcharges.length > 0 && (
                <Card className="mt-8 max-w-7xl mx-auto border-zinc-200">
                    <CardContent className="p-4 md:p-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
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
                    </CardContent>
                </Card>
            )}

            <div className="max-w-7xl mx-auto mt-8 md:mt-12 overflow-x-hidden rounded-xl border border-gray-200 bg-white">
                {products.length > 0 ? (
                    <ElementSelector
                        elements={elementsForSelector}
                        groups={groupNames}
                        priceFactor={factor}
                        extraHeaders={extraHeaders}
                        renderExtraColumns={renderExtraColumns}
                        showVisualizer={false}
                    />
                ) : (
                    <p className="text-center text-gray-500 text-lg mt-10">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}
