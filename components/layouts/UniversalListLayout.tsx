"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PriceSimulator from "@/components/PriceSimulator";
import ReportButton from "@/components/ReportButton";
import ElementSelector from "@/components/ElementSelector";
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
import type {
    ListBasedData,
    TableBasedData,
    DynamicGroupsData,
    UniversalProduct,
    Surcharge,
    PriceElement,
} from "@/lib/types";

// ============================================
// TYPY
// ============================================

type ListData = ListBasedData | TableBasedData | DynamicGroupsData;

interface Props {
    data: ListData;
    title?: string;
    priceFactor?: number;
    priceGroups?: string[];
    config?: {
        displayMode?: "cards" | "table" | "auto"; // Tryb wyświetlania
        showElements?: boolean; // Pokaż elementy (MpNidzica)
        showLegColor?: boolean; // Pokaż kolor nogi (Puszman)
        showTechnicalImage?: boolean; // Pokaż zdjęcie techniczne
    };
}

// ============================================
// HELPERS
// ============================================

function getProducts(data: ListData): UniversalProduct[] {
    if ("Arkusz1" in data) return data.Arkusz1 || [];
    if ("products" in data) return data.products || [];
    return [];
}

function getPriceGroups(data: ListData, propsGroups?: string[]): string[] {
    if (propsGroups && propsGroups.length > 0) return propsGroups;
    if ("priceGroups" in data && data.priceGroups) return data.priceGroups;

    // Wykryj z produktów
    const products = getProducts(data);
    const groups = new Set<string>();

    // Sprawdź czy to format Puszman
    const defaultPuszman = [
        "grupa I",
        "grupa II",
        "grupa III",
        "grupa IV",
        "grupa V",
        "grupa VI",
    ];
    const isPuszman = products.some((p) => p["grupa I"] !== undefined);
    if (isPuszman) return defaultPuszman;

    products.forEach((p) => {
        Object.keys(p.prices || {}).forEach((g) => groups.add(g));
        if (Array.isArray(p.elements)) {
            p.elements.forEach((el: any) =>
                Object.keys(el.prices || {}).forEach((g) => groups.add(g))
            );
        }
    });

    return Array.from(groups);
}

function getProductName(product: UniversalProduct): string {
    return product.name || product.MODEL || "Bez nazwy";
}

function getProductPrice(product: UniversalProduct, group: string): number {
    // Puszman format
    if (product[group] !== undefined) return product[group] as number;
    // Standard format
    return (product.prices?.[group] as number) || 0;
}

// ============================================
// KARTA PRODUKTU (dla MpNidzica style)
// ============================================

interface ProductCardProps {
    product: UniversalProduct;
    priceGroups: string[];
    priceFactor: number;
    surcharges: Surcharge[];
    producerName: string;
    showTechnicalImage?: boolean;
}

function ProductCard({
    product,
    priceGroups,
    priceFactor,
    surcharges,
    producerName,
    showTechnicalImage = true,
}: ProductCardProps) {
    const [imageLoading, setImageLoading] = useState(true);
    const [techImageLoading, setTechImageLoading] = useState(true);
    const productId = `product-${normalizeToId(getProductName(product))}`;

    const finalFactor = product.priceFactor ?? priceFactor;
    const hasElements =
        Array.isArray(product.elements) && product.elements.length > 0;

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
                                    alt={getProductName(product)}
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
                                {getProductName(product)}
                            </h2>
                        </div>
                        {product.previousName && (
                            <p className="text-sm text-gray-400 text-center md:text-end">
                                (dawniej: {product.previousName})
                            </p>
                        )}
                    </div>
                </div>

                {/* ELEMENT SELECTOR (dla MpNidzica) */}
                {hasElements && (
                    <ElementSelector
                        elements={
                            product.elements as unknown as Record<string, any>
                        }
                        groups={priceGroups}
                        discount={product.discount}
                        priceFactor={finalFactor}
                    />
                )}

                {/* TECHNICAL IMAGE */}
                {showTechnicalImage && product.technicalImage && (
                    <div className="mt-6 flex justify-center">
                        <div className="relative">
                            {techImageLoading && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded-lg" />
                            )}
                            <Image
                                src={product.technicalImage}
                                alt={`${getProductName(product)} - wymiary`}
                                width={600}
                                height={300}
                                className="object-contain max-h-64 w-auto"
                                onLoad={() => setTechImageLoading(false)}
                            />
                        </div>
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

                {/* DISCOUNT INFO */}
                {product.discount && product.discountLabel && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                            <strong>-{product.discount}%</strong>{" "}
                            {product.discountLabel}
                        </p>
                    </div>
                )}

                {/* Report & Info buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <ReportButton
                        producerName={producerName}
                        productName={getProductName(product)}
                    />
                    {(product.previousName || finalFactor !== 1) && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <HelpCircle className="w-5 h-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="space-y-1">
                                {product.previousName && (
                                    <p>
                                        Poprzednia nazwa: {product.previousName}
                                    </p>
                                )}
                                {finalFactor !== 1 && (
                                    <p>Mnożnik: x{finalFactor.toFixed(2)}</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================
// WIERSZ TABELI (dla Puszman style)
// ============================================

interface TableRowCardProps {
    product: UniversalProduct;
    priceGroups: string[];
    priceFactor: number;
    producerName: string;
    showLegColor?: boolean;
}

function TableRowCard({
    product,
    priceGroups,
    priceFactor,
    producerName,
    showLegColor = true,
}: TableRowCardProps) {
    const productId = `product-${normalizeToId(getProductName(product))}`;
    const finalFactor = product.priceFactor ?? priceFactor;

    const calculatePrice = (basePrice: number): number => {
        let price = Math.round(basePrice * finalFactor);
        if (product.discount && product.discount > 0) {
            price = Math.round(price * (1 - product.discount / 100));
        }
        return price;
    };

    return (
        <Card
            id={productId}
            className="border-zinc-200 scroll-mt-24 relative md:hidden"
        >
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                        {getProductName(product)}
                    </CardTitle>
                    {product.discount && product.discount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            -{product.discount}%
                        </Badge>
                    )}
                </div>
                {product.previousName && (
                    <p className="text-xs text-gray-400">
                        (dawniej: {product.previousName})
                    </p>
                )}
            </CardHeader>
            <CardContent className="pt-0">
                {/* Price groups grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {priceGroups.map((group) => {
                        const rawPrice = getProductPrice(product, group);
                        const price = rawPrice
                            ? calculatePrice(rawPrice)
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
                {showLegColor && product["KOLOR NOGI"] && (
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

            {/* Ikony */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <ReportButton
                    producerName={producerName}
                    productName={getProductName(product)}
                />
                {(product.previousName || finalFactor !== 1) && (
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
                            {finalFactor !== 1 && (
                                <p>Mnożnik: x{finalFactor.toFixed(2)}</p>
                            )}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </Card>
    );
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function UniversalListLayout({
    data,
    title,
    priceFactor = 1,
    priceGroups: propsPriceGroups,
    config = {},
}: Props) {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);

    const {
        displayMode = "auto",
        showElements = true,
        showLegColor = true,
        showTechnicalImage = true,
    } = config;

    const products = getProducts(data);
    const priceGroups = getPriceGroups(data, propsPriceGroups);
    const surcharges: Surcharge[] = data.surcharges || [];
    const baseFactor =
        ("priceFactor" in data ? data.priceFactor : undefined) ?? priceFactor;
    const factor = simulationFactor !== 1 ? simulationFactor : baseFactor;

    // Określ tryb wyświetlania
    const hasElements = products.some(
        (p) => Array.isArray(p.elements) && p.elements.length > 0
    );
    const isTableMode =
        displayMode === "table" || (displayMode === "auto" && !hasElements);

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) setSearch(urlSearch);
    }, [searchParams]);

    // Filtruj produkty
    const filteredProducts = useMemo(() => {
        const filtered = !search.trim()
            ? products
            : products.filter((p) => {
                  const name = getProductName(p).toLowerCase();
                  const prevName = (p.previousName || "").toLowerCase();
                  const query = search.toLowerCase();
                  return name.includes(query) || prevName.includes(query);
              });
        return [...filtered].sort((a, b) =>
            getProductName(a).localeCompare(getProductName(b), "pl")
        );
    }, [products, search]);

    // Scroll do elementu z hash
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
                {filteredProducts.length > 0 ? (
                    isTableMode ? (
                        <>
                            {/* Mobile: Card view */}
                            <div className="md:hidden space-y-4">
                                {filteredProducts.map((product, idx) => (
                                    <TableRowCard
                                        key={idx}
                                        product={product}
                                        priceGroups={priceGroups}
                                        priceFactor={factor}
                                        producerName={title || ""}
                                        showLegColor={showLegColor}
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
                                            {showLegColor && (
                                                <TableHead className="min-w-[150px]">
                                                    Kolor nogi
                                                </TableHead>
                                            )}
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map(
                                            (product, idx) => {
                                                const finalFactor =
                                                    product.priceFactor ??
                                                    factor;
                                                const calculatePrice = (
                                                    basePrice: number
                                                ): number => {
                                                    let price = Math.round(
                                                        basePrice * finalFactor
                                                    );
                                                    if (
                                                        product.discount &&
                                                        product.discount > 0
                                                    ) {
                                                        price = Math.round(
                                                            price *
                                                                (1 -
                                                                    product.discount /
                                                                        100)
                                                        );
                                                    }
                                                    return price;
                                                };

                                                return (
                                                    <TableRow
                                                        key={idx}
                                                        id={`product-${normalizeToId(
                                                            getProductName(
                                                                product
                                                            )
                                                        )}`}
                                                        className={`scroll-mt-24 ${
                                                            idx % 2 === 0
                                                                ? "bg-white"
                                                                : "bg-gray-50"
                                                        }`}
                                                    >
                                                        <TableCell className="font-semibold text-gray-900">
                                                            <div className="flex items-center gap-2">
                                                                {getProductName(
                                                                    product
                                                                )}
                                                                {product.discount &&
                                                                    product.discount >
                                                                        0 && (
                                                                        <Badge
                                                                            variant="destructive"
                                                                            className="text-xs"
                                                                        >
                                                                            -
                                                                            {
                                                                                product.discount
                                                                            }
                                                                            %
                                                                        </Badge>
                                                                    )}
                                                            </div>
                                                            {product.previousName && (
                                                                <p className="text-xs text-gray-400 font-normal">
                                                                    (dawniej:{" "}
                                                                    {
                                                                        product.previousName
                                                                    }
                                                                    )
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        {priceGroups.map(
                                                            (group) => {
                                                                const rawPrice =
                                                                    getProductPrice(
                                                                        product,
                                                                        group
                                                                    );
                                                                const price =
                                                                    rawPrice
                                                                        ? calculatePrice(
                                                                              rawPrice
                                                                          )
                                                                        : undefined;
                                                                return (
                                                                    <TableCell
                                                                        key={
                                                                            group
                                                                        }
                                                                        className="text-center text-sm font-medium text-gray-800"
                                                                    >
                                                                        {price ? (
                                                                            <span className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 text-gray-900 rounded-lg font-semibold">
                                                                                {
                                                                                    price
                                                                                }{" "}
                                                                                zł
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400">
                                                                                -
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            }
                                                        )}
                                                        {showLegColor && (
                                                            <TableCell className="text-sm text-gray-700">
                                                                {product[
                                                                    "KOLOR NOGI"
                                                                ] ? (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="bg-amber-100 text-amber-800"
                                                                    >
                                                                        {
                                                                            product[
                                                                                "KOLOR NOGI"
                                                                            ]
                                                                        }
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-gray-400">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <ReportButton
                                                                    producerName={
                                                                        title ||
                                                                        ""
                                                                    }
                                                                    productName={getProductName(
                                                                        product
                                                                    )}
                                                                />
                                                                {(product.previousName ||
                                                                    finalFactor !==
                                                                        factor) && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <button className="text-gray-400 hover:text-gray-600">
                                                                                <HelpCircle className="w-4 h-4" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            {product.previousName && (
                                                                                <p>
                                                                                    Poprzednia
                                                                                    nazwa:{" "}
                                                                                    {
                                                                                        product.previousName
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {finalFactor !==
                                                                                factor && (
                                                                                <p>
                                                                                    Mnożnik:
                                                                                    x
                                                                                    {finalFactor.toFixed(
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
                                                );
                                            }
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </>
                    ) : (
                        /* Card view dla produktów z elementami (MpNidzica) */
                        <div className="space-y-8 md:space-y-20">
                            {filteredProducts.map((product, idx) => (
                                <ProductCard
                                    key={idx}
                                    product={product}
                                    priceGroups={priceGroups}
                                    priceFactor={factor}
                                    surcharges={surcharges}
                                    producerName={title || ""}
                                    showTechnicalImage={showTechnicalImage}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    <p className="text-center text-gray-500 text-base md:text-lg mt-10 md:mt-20">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}
