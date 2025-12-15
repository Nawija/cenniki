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
import type { PuszmanData, PuszmanProduct, Surcharge } from "@/lib/types";

interface Props {
    data: PuszmanData;
    title?: string;
    priceGroups?: string[];
    priceFactor?: number;
}

const DEFAULT_GROUPS = [
    "grupa I",
    "grupa II",
    "grupa III",
    "grupa IV",
    "grupa V",
    "grupa VI",
];

// Mobile card component
function ProductCard({
    product,
    groupNames,
    priceFactor = 1,
    producerName = "",
}: {
    product: PuszmanProduct;
    groupNames: string[];
    priceFactor?: number;
    producerName?: string;
}) {
    const productId = `product-${normalizeToId(product.MODEL)}`;

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
                    {groupNames.map((group) => {
                        const rawPrice = product[group] as number | undefined;
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

                {/* Leg color */}
                {product["KOLOR NOGI"] &&
                    product["KOLOR NOGI"].toLowerCase() !== "x" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                                Kolor nogi:
                            </span>
                            <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800"
                            >
                                {product["KOLOR NOGI"]}
                            </Badge>
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

export default function PuszmanLayout({
    data,
    title,
    priceGroups,
    priceFactor = 1,
}: Props) {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);
    const groupNames = priceGroups || DEFAULT_GROUPS;
    const surcharges: Surcharge[] = data.surcharges || [];
    // Jeśli symulacja aktywna, użyj jej zamiast bazowego faktora
    const baseFactor = data.priceFactor ?? priceFactor;
    const factor = simulationFactor !== 1 ? simulationFactor : baseFactor;

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
                            groupNames={groupNames}
                            priceFactor={factor}
                            producerName={title || "Puszman"}
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
                                {groupNames.map((group) => (
                                    <TableHead
                                        key={group}
                                        className="text-center whitespace-nowrap"
                                    >
                                        {group}
                                    </TableHead>
                                ))}
                                <TableHead className="min-w-[150px]">
                                    Kolor nogi
                                </TableHead>
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
                                    className={`scroll-mt-24 hover:bg-blue-50 ${
                                        idx % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <TableCell className="font-semibold text-gray-900">
                                        {product.MODEL}
                                    </TableCell>
                                    {groupNames.map((group) => {
                                        const rawPrice = product[group] as
                                            | number
                                            | undefined;
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
                                    <TableCell className="text-sm text-gray-700">
                                        {product["KOLOR NOGI"] &&
                                        product["KOLOR NOGI"].toLowerCase() !==
                                            "x" ? (
                                            <Badge
                                                variant="secondary"
                                                className="bg-amber-100 text-amber-800"
                                            >
                                                {product["KOLOR NOGI"]}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400">
                                                Brak
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <ReportButton
                                                producerName={
                                                    title || "Puszman"
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
