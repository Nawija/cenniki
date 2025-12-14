"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PriceSimulator from "@/components/PriceSimulator";
import ReportButton from "@/components/ReportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { normalizeToId } from "@/lib/utils";
import { useScrollToHash } from "@/hooks";
import type {
    CategoryBasedData,
    UniversalProduct,
    Surcharge,
    ProductSize,
    PriceElement,
} from "@/lib/types";

// ============================================
// TYPY
// ============================================

interface Props {
    data: CategoryBasedData;
    title?: string;
    priceFactor?: number;
    producerName?: string;
    config?: {
        showLegInfo?: boolean; // Pokaż informacje o nogach (Bomar)
        showMaterial?: boolean; // Pokaż materiał
        showSurcharges?: boolean; // Pokaż dopłaty
        cardStyle?: "default" | "compact" | "detailed";
    };
}

// ============================================
// KARTA PRODUKTU - UNIWERSALNA
// ============================================

interface ProductCardProps {
    name: string;
    product: UniversalProduct;
    priceFactor: number;
    categorySurcharges?: Surcharge[];
    producerName: string;
    cardStyle?: "default" | "compact" | "detailed";
}

function UniversalProductCard({
    name,
    product,
    priceFactor,
    categorySurcharges = [],
    producerName,
    cardStyle = "default",
}: ProductCardProps) {
    const [imageLoading, setImageLoading] = useState(true);
    const productId = `product-${normalizeToId(name)}`;

    // Mnożnik produktu ma priorytet nad kategorią
    const finalFactor = product.priceFactor ?? priceFactor;

    // Oblicz cenę z rabatem
    const calculatePrice = (basePrice: number | string): number => {
        const price =
            typeof basePrice === "string" ? parseFloat(basePrice) : basePrice;
        let finalPrice = Math.round(price * finalFactor);
        if (product.discount && product.discount > 0) {
            finalPrice = Math.round(finalPrice * (1 - product.discount / 100));
        }
        return finalPrice;
    };

    // Sprawdź czy ma rozmiary
    const hasSizes = (product.sizes?.length ?? 0) > 0;
    // Sprawdź czy ma grupy cenowe
    const hasPrices = product.prices && Object.keys(product.prices).length > 0;
    // Sprawdź czy ma pojedynczą cenę
    const hasSinglePrice = product.price !== undefined;
    // Sprawdź czy ma elementy (Furnirest)
    const hasElements = (product.elements?.length ?? 0) > 0;

    return (
        <Card
            id={productId}
            className="overflow-hidden hover:shadow-lg transition-shadow duration-300 scroll-mt-24 h-full flex flex-col"
        >
            {/* Obrazek */}
            {product.image && (
                <div className="relative aspect-[4/3] bg-gray-100">
                    {imageLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
                    )}
                    {product.discount && product.discount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute top-2 left-2 z-10 rounded-full text-sm font-bold px-2 py-1"
                        >
                            -{product.discount}%
                        </Badge>
                    )}
                    <Image
                        src={product.image}
                        alt={name}
                        fill
                        className="object-cover"
                        onLoad={() => setImageLoading(false)}
                    />
                </div>
            )}

            <CardContent className="p-4 flex-1 flex flex-col">
                {/* Nagłówek */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {name}
                        </h3>
                        {product.material && (
                            <p className="text-sm text-gray-500">
                                {product.material}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <ReportButton
                            producerName={producerName}
                            productName={name}
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
                                        <p>
                                            Poprzednia nazwa:{" "}
                                            {product.previousName}
                                        </p>
                                    )}
                                    {finalFactor !== 1 && (
                                        <p>
                                            Mnożnik: x{finalFactor.toFixed(2)}
                                        </p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Rozmiary z cenami (Bomar stoły) */}
                {hasSizes && (
                    <div className="space-y-2 mb-4">
                        {product.sizes!.map(
                            (size: ProductSize, idx: number) => {
                                const price = calculatePrice(size.prices);
                                return (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                                    >
                                        <span className="text-sm text-gray-700">
                                            {size.dimension}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {price} zł
                                        </span>
                                    </div>
                                );
                            }
                        )}
                    </div>
                )}

                {/* Grupy cenowe (Bomar krzesła, Verikon) */}
                {hasPrices && !hasSizes && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.entries(product.prices!).map(
                            ([group, basePrice]) => {
                                const price = calculatePrice(
                                    basePrice as number
                                );
                                return (
                                    <div
                                        key={group}
                                        className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                                    >
                                        <span className="text-xs text-gray-500">
                                            {group}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {price} zł
                                        </span>
                                    </div>
                                );
                            }
                        )}
                    </div>
                )}

                {/* Pojedyncza cena (TopLine) */}
                {hasSinglePrice && (
                    <div className="mb-4">
                        <div className="text-center py-3 bg-orange-50 rounded-lg">
                            <span className="text-2xl font-bold text-orange-600">
                                {calculatePrice(product.price!)} zł
                            </span>
                        </div>
                    </div>
                )}

                {/* Elementy (Furnirest) */}
                {hasElements && (
                    <div className="space-y-2 mb-4">
                        {product
                            .elements!.slice(0, 3)
                            .map((element: PriceElement, idx: number) => (
                                <div
                                    key={idx}
                                    className="bg-gray-50 rounded-lg p-2"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            {element.name || element.code}
                                        </span>
                                        {element.dimension && (
                                            <span className="text-xs text-gray-400">
                                                {element.dimension}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        {Object.entries(element.prices || {})
                                            .slice(0, 2)
                                            .map(([g, p]) => (
                                                <span
                                                    key={g}
                                                    className="text-xs"
                                                >
                                                    <span className="text-gray-400">
                                                        {g}:
                                                    </span>{" "}
                                                    <span className="font-semibold">
                                                        {calculatePrice(
                                                            p as number
                                                        )}{" "}
                                                        zł
                                                    </span>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        {product.elements!.length > 3 && (
                            <p className="text-xs text-gray-400 text-center">
                                +{product.elements!.length - 3} więcej elementów
                            </p>
                        )}
                    </div>
                )}

                {/* Wymiary (TopLine) */}
                {typeof product.dimensions === "string" &&
                    product.dimensions && (
                        <div className="mb-4 space-y-1">
                            {product.dimensions.split("\n").map((line, idx) => (
                                <p key={idx} className="text-sm text-gray-600">
                                    • {line}
                                </p>
                            ))}
                        </div>
                    )}

                {/* Opis */}
                {product.description && (
                    <div className="text-sm text-gray-500 mb-4 line-clamp-3">
                        {Array.isArray(product.description)
                            ? product.description.join(" • ")
                            : product.description}
                    </div>
                )}

                {/* Opcje */}
                {product.options && product.options.length > 0 && (
                    <div className="mt-auto pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">Opcje:</p>
                        <div className="flex flex-wrap gap-1">
                            {product.options.slice(0, 3).map((opt, idx) => (
                                <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                >
                                    {opt.length > 30
                                        ? opt.slice(0, 30) + "..."
                                        : opt}
                                </Badge>
                            ))}
                            {product.options.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{product.options.length - 3}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Dopłaty kategorii */}
                {categorySurcharges.length > 0 && (
                    <div className="mt-auto pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1">
                            {categorySurcharges.map((s, idx) => (
                                <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs bg-amber-50 text-amber-700"
                                >
                                    {s.label}: +{s.percent}%
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function UniversalCategoryLayout({
    data,
    title,
    priceFactor = 1,
    producerName = "",
    config = {},
}: Props) {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set()
    );

    const {
        showLegInfo = false,
        showMaterial = true,
        showSurcharges = true,
        cardStyle = "default",
    } = config;

    // Odczytaj parametr search z URL
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) setSearch(urlSearch);
    }, [searchParams]);

    // Scroll do elementu z hash
    useScrollToHash();

    // Filtruj kategorie i produkty
    const filteredCategories = useMemo(() => {
        if (!search.trim()) return data.categories || {};

        const query = search.toLowerCase();
        const result: Record<string, Record<string, UniversalProduct>> = {};

        Object.entries(data.categories || {}).forEach(([catName, products]) => {
            const filtered = Object.entries(products).filter(
                ([name, productData]) =>
                    name.toLowerCase().includes(query) ||
                    productData.previousName?.toLowerCase().includes(query)
            );
            if (filtered.length > 0) {
                result[catName] = Object.fromEntries(filtered);
            }
        });

        return result;
    }, [data.categories, search]);

    const toggleCategory = (catName: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(catName)) next.delete(catName);
            else next.add(catName);
            return next;
        });
    };

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity space-y-8">
            <PageHeader
                title={title || data.title}
                search={search}
                onSearchChange={setSearch}
            />

            <PriceSimulator
                currentFactor={simulationFactor}
                onFactorChange={setSimulationFactor}
            />

            {/* Informacje o nogach (Bomar) */}
            {showLegInfo && !search.trim() && (
                <div className="max-w-7xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-6 space-y-8">
                        <div className="pt-6">
                            <p className="text-gray-700 text-center text-base">
                                Umożliwiamy zmianę nóg na inne niż widoczne na
                                zdjęciach:
                            </p>
                            <p className="text-gray-800 font-semibold text-center mt-2">
                                rodzaje stelaży nóg (trzy typy):
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                            {[
                                {
                                    name: "1. standardowa",
                                    img: "/images/bomar/dodatkoweOpcje/1.png",
                                },
                                {
                                    name: "2. skośna (mechanizm obrotowy 3-stopniowy)",
                                    img: "/images/bomar/dodatkoweOpcje/2.png",
                                },
                                {
                                    name: "3. meduza",
                                    img: "/images/bomar/dodatkoweOpcje/3.png",
                                },
                            ].map((leg) => (
                                <div
                                    key={leg.name}
                                    className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
                                >
                                    <span className="text-sm font-medium text-gray-700 mb-2">
                                        {leg.name}
                                    </span>
                                    <div className="h-32 w-full relative flex items-center justify-center">
                                        <Image
                                            src={leg.img}
                                            alt={leg.name}
                                            fill
                                            style={{ objectFit: "contain" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-yellow-50/80 rounded-xl border-yellow-200 border">
                            <div className="w-24 h-24 flex-shrink-0 relative bg-gray-200 rounded-lg overflow-hidden">
                                <Image
                                    src="/images/bomar/dodatkoweOpcje/4.png"
                                    alt="Siedzisko sprężynowe"
                                    fill
                                    style={{ objectFit: "cover" }}
                                />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">
                                    *system sprężyn kieszeniowych (siedzisko -
                                    jeden rodzaj, szycie na półokrągło, grubość
                                    ok 11 cm)
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    (niezależnie od modelu krzesła) przez
                                    zwiększoną grubość siedziska, obniżony
                                    stelaż nóg{" "}
                                    <span className="font-medium text-red-600">
                                        wysokość 42 cm
                                    </span>
                                    .
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Kategorie */}
            {Object.keys(filteredCategories).length > 0 ? (
                Object.entries(filteredCategories).map(
                    ([categoryName, products]) => {
                        const categorySurcharges =
                            data.categorySettings?.[categoryName]?.surcharges ||
                            [];
                        const baseFactor =
                            data.categoryPriceFactors?.[categoryName] ??
                            priceFactor;
                        const categoryFactor =
                            simulationFactor !== 1
                                ? simulationFactor
                                : baseFactor;
                        const productEntries = Object.entries(products).sort(
                            ([a], [b]) => a.localeCompare(b, "pl")
                        );

                        return (
                            <section
                                key={categoryName}
                                id={categoryName}
                                className="w-full max-w-7xl mx-auto scroll-mt-8"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-semibold capitalize text-gray-900">
                                        {categoryName}
                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                            ({productEntries.length} produktów)
                                        </span>
                                    </h2>
                                    {showSurcharges &&
                                        categorySurcharges.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {categorySurcharges.map(
                                                    (s, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="secondary"
                                                            className="bg-amber-50 text-amber-700"
                                                        >
                                                            {s.label}: +
                                                            {s.percent}%
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {productEntries.map(
                                        ([productName, productData]) => (
                                            <UniversalProductCard
                                                key={productName}
                                                name={productName}
                                                product={productData}
                                                priceFactor={categoryFactor}
                                                categorySurcharges={
                                                    showSurcharges
                                                        ? categorySurcharges
                                                        : []
                                                }
                                                producerName={
                                                    producerName || title || ""
                                                }
                                                cardStyle={cardStyle}
                                            />
                                        )
                                    )}
                                </div>
                            </section>
                        );
                    }
                )
            ) : (
                <div className="max-w-7xl mx-auto text-center py-20">
                    <p className="text-gray-500 text-lg">
                        {search.trim()
                            ? "Brak produktów pasujących do wyszukiwania."
                            : "Brak produktów."}
                    </p>
                </div>
            )}
        </div>
    );
}
