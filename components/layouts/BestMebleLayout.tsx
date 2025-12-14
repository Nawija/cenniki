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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { normalizeToId } from "@/lib/utils";
import { useScrollToHash } from "@/hooks";
import type { BestMebleData, BestMebleProduct, Surcharge } from "@/lib/types";

interface Props {
    data: BestMebleData;
    title?: string;
    priceFactor?: number;
}

// Mobile card component
function ProductCard({
    product,
    priceGroups,
    dimensionLabels,
    priceFactor = 1,
    producerName = "",
}: {
    product: BestMebleProduct;
    priceGroups: string[];
    dimensionLabels?: string[];
    priceFactor?: number;
    producerName?: string;
}) {
    const productId = `product-${normalizeToId(product.MODEL)}`;
    const hasDimensions =
        dimensionLabels &&
        dimensionLabels.length > 0 &&
        product.dimensions &&
        Object.keys(product.dimensions).length > 0;

    return (
        <Card id={productId} className="border-zinc-200 scroll-mt-24 relative">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{product.MODEL}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {/* Price groups grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {priceGroups.map((group) => {
                        const rawPrice = product.prices?.[group];
                        const price = rawPrice
                            ? Math.round(rawPrice * priceFactor)
                            : undefined;
                        return (
                            <div
                                key={group}
                                className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                            >
                                <span className="text-xs text-gray-500 uppercase">
                                    {group}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {price ? `${price} zł` : "-"}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Dimensions */}
                {hasDimensions && (
                    <div className="pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500 block mb-2">
                            Wymiary:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {dimensionLabels.map((label) => {
                                const value = product.dimensions?.[label];
                                if (!value) return null;
                                return (
                                    <div
                                        key={label}
                                        className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2"
                                    >
                                        <span className="text-xs text-blue-600">
                                            {label}
                                        </span>
                                        <span className="text-sm font-medium text-blue-900">
                                            {value}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
            {/* Ikony w prawym dolnym rogu */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {producerName && (
                    <ReportButton
                        producerName={producerName}
                        productName={product.MODEL}
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
    const priceGroups = data.priceGroups || [];
    const dimensionLabels = data.dimensionLabels || [];
    const surcharges: Surcharge[] = data.surcharges || [];

    // Jeśli symulacja aktywna, użyj jej zamiast bazowego faktora
    const baseFactor = data.priceFactor ?? priceFactor;
    const factor = simulationFactor !== 1 ? simulationFactor : baseFactor;

    // Sprawdź czy jakikolwiek produkt ma wymiary
    const hasDimensionsColumn = useMemo(() => {
        if (!dimensionLabels || dimensionLabels.length === 0) return false;
        return data.products.some(
            (p) => p.dimensions && Object.keys(p.dimensions).length > 0
        );
    }, [data.products, dimensionLabels]);

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearch(urlSearch);
        }
    }, [searchParams]);

    const allProducts: BestMebleProduct[] = (data.products || []).filter(
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

            <div className="max-w-7xl mx-auto mt-8 md:mt-12">
                {/* Mobile: Card view */}
                <div className="md:hidden space-y-4">
                    {products.map((product, idx) => (
                        <ProductCard
                            key={idx}
                            product={product}
                            priceGroups={priceGroups}
                            dimensionLabels={
                                hasDimensionsColumn
                                    ? dimensionLabels
                                    : undefined
                            }
                            priceFactor={factor}
                            producerName={title || "Best Meble"}
                        />
                    ))}
                </div>

                {/* Desktop: Table view */}
                <Card className="hidden md:block border-zinc-200 overflow-hidden p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-100">
                                <TableHead className="min-w-[200px]">
                                    Model
                                </TableHead>
                                {priceGroups.map((group) => (
                                    <TableHead
                                        key={group}
                                        className="text-center whitespace-nowrap"
                                    >
                                        {group}
                                    </TableHead>
                                ))}
                                {hasDimensionsColumn &&
                                    dimensionLabels.map((label) => (
                                        <TableHead
                                            key={label}
                                            className="text-center whitespace-nowrap bg-blue-50"
                                        >
                                            {label}
                                        </TableHead>
                                    ))}
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product, idx) => (
                                <TableRow
                                    key={idx}
                                    id={`product-${normalizeToId(
                                        product.MODEL
                                    )}`}
                                    className={`scroll-mt-24 ${
                                        idx % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <TableCell className="font-semibold text-gray-900">
                                        {product.MODEL}
                                    </TableCell>
                                    {priceGroups.map((group) => {
                                        const rawPrice =
                                            product.prices?.[group];
                                        const price = rawPrice
                                            ? Math.round(rawPrice * factor)
                                            : undefined;
                                        return (
                                            <TableCell
                                                key={group}
                                                className="text-center text-sm font-medium text-gray-800"
                                            >
                                                {price ? (
                                                    <span className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 text-gray-900 rounded-lg font-semibold">
                                                        {price} zł
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    {hasDimensionsColumn &&
                                        dimensionLabels.map((label) => {
                                            const value =
                                                product.dimensions?.[label];
                                            return (
                                                <TableCell
                                                    key={label}
                                                    className="text-center text-sm text-blue-800 bg-blue-50/50"
                                                >
                                                    {value || (
                                                        <span className="text-gray-400">
                                                            -
                                                        </span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <ReportButton
                                                producerName={
                                                    title || "Best Meble"
                                                }
                                                productName={product.MODEL}
                                            />
                                            {(product.previousName ||
                                                factor !== 1) && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                                            <HelpCircle className="w-4 h-4" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="space-y-1">
                                                        {product.previousName && (
                                                            <p>
                                                                Poprzednia
                                                                nazwa:{" "}
                                                                {
                                                                    product.previousName
                                                                }
                                                            </p>
                                                        )}
                                                        {factor !== 1 && (
                                                            <p>
                                                                Faktor: x
                                                                {factor.toFixed(
                                                                    2
                                                                )}
                                                            </p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {products.length === 0 && (
                    <p className="text-center text-gray-500 text-lg mt-10">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}
