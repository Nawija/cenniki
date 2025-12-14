"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeToId } from "@/lib/utils";

interface SearchResult {
    name: string;
    previousName?: string;
    producerSlug: string;
    producerName: string;
    productId: string;
}

interface ProducerData {
    slug: string;
    displayName: string;
    layoutType: string;
    data: any;
}

// Ekstrakcja produktów z różnych formatów danych
function extractProducts(producer: ProducerData): SearchResult[] {
    const results: SearchResult[] = [];
    const { data, slug, displayName, layoutType } = producer;

    // Format z kategoriami: categories -> { categoryName -> { productName -> data } }
    if (data?.categories) {
        Object.entries(data.categories).forEach(([_categoryName, products]) => {
            Object.entries(
                products as Record<string, { previousName?: string }>
            ).forEach(([productName, productData]) => {
                results.push({
                    name: productName,
                    previousName: productData?.previousName,
                    producerSlug: slug,
                    producerName: displayName,
                    productId: `product-${normalizeToId(productName)}`,
                });
            });
        });
    }

    // Format z listą produktów: products -> [{ name, previousName, ... }]
    if (data?.products && Array.isArray(data.products)) {
        data.products.forEach(
            (product: { name: string; previousName?: string }) => {
                if (product.name) {
                    results.push({
                        name: product.name,
                        previousName: product.previousName,
                        producerSlug: slug,
                        producerName: displayName,
                        productId: `product-${normalizeToId(product.name)}`,
                    });
                }
            }
        );
    }

    // Format Arkusz1 (Puszman): Arkusz1 -> [{ MODEL, previousName, ... }]
    if (data?.Arkusz1 && Array.isArray(data.Arkusz1)) {
        data.Arkusz1.forEach(
            (product: { MODEL: string; previousName?: string }) => {
                if (product.MODEL) {
                    results.push({
                        name: product.MODEL,
                        previousName: product.previousName,
                        producerSlug: slug,
                        producerName: displayName,
                        productId: `product-${normalizeToId(product.MODEL)}`,
                    });
                }
            }
        );
    }

    return results;
}

interface GlobalSearchProps {
    producersData: ProducerData[];
}

export default function GlobalSearch({ producersData }: GlobalSearchProps) {
    const [search, setSearch] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Ekstrakcja wszystkich produktów ze wszystkich producentów
    const allProducts = useMemo(() => {
        return producersData.flatMap(extractProducts);
    }, [producersData]);

    // Filtrowanie wyników
    const searchResults = useMemo(() => {
        if (!search.trim()) return [];

        const query = search.toLowerCase();
        return allProducts
            .filter(
                (product) =>
                    product.name.toLowerCase().includes(query) ||
                    (product.previousName &&
                        product.previousName.toLowerCase().includes(query))
            )
            .slice(0, 15); // Limit do 15 wyników
    }, [allProducts, search]);

    // Zamknij dropdown po kliknięciu poza komponent
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsFocused(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const clearSearch = () => {
        setSearch("");
        inputRef.current?.focus();
    };

    const showDropdown = isFocused && search.trim().length > 0;

    return (
        <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
            {/* Input z animowanym obramowaniem w stylu Google */}
            <div className="relative">
                {/* Szare tło bordera */}
                <div className="absolute -inset-[2px] rounded-full bg-gray-100" />

                {/* Animowany kolorowy segment */}
                {!isFocused && (
                    <div className="absolute -inset-[2px] rounded-full overflow-hidden">
                        <div
                            className="absolute inset-0 blur-sm animate-google-border"
                            style={{
                                background:
                                    "conic-gradient(from 0deg, #4285F4 0deg, #4285F4 30deg, #EA4335 45deg, #EA4335 75deg, #FBBC05 90deg, #FBBC05 120deg, #34A853 135deg, #34A853 165deg, transparent 180deg, transparent 360deg)",
                            }}
                        />
                    </div>
                )}
                {/* Białe tło pod inputem */}
                <div className="absolute inset-0 rounded-full bg-gray-200" />

                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <Input
                    ref={inputRef}
                    type="text"
                    className="relative w-full h-12 pl-12 pr-10 rounded-full bg-transparent shadow-2xl text-base border-0 focus:ring-0 focus:outline-none z-10"
                    placeholder="Szukaj produkt po nazwie..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                />
                {search && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Dropdown z wynikami */}
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                            {searchResults.map((result, idx) => (
                                <li
                                    key={`${result.producerSlug}-${result.name}-${idx}`}
                                >
                                    <Link
                                        href={`/p/${
                                            result.producerSlug
                                        }?search=${encodeURIComponent(
                                            result.name
                                        )}#${result.productId}`}
                                        onClick={() => {
                                            setIsFocused(false);
                                            setSearch("");
                                        }}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {result.name}
                                            </p>
                                            {result.previousName && (
                                                <p className="text-xs text-gray-500 truncate">
                                                    poprzednio:{" "}
                                                    {result.previousName}
                                                </p>
                                            )}
                                        </div>
                                        <span className="ml-3 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full shrink-0">
                                            {result.producerName}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <p className="text-sm">
                                Brak wyników dla &quot;{search}&quot;
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
