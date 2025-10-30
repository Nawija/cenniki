"use client";

import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";

type ProductSize = {
    dimension: string;
    prices: string | number;
};

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

interface Props {
    cennikData: CennikData;
    manufacturer: string;
}

type ProductOverride = {
    id: string;
    manufacturer: string;
    category: string;
    productName: string;
    customName: string | null;
    priceFactor: number;
};

export default function ProducentPageClient({
    cennikData,
    manufacturer,
}: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [overrides, setOverrides] = useState<Record<string, ProductOverride>>(
        {}
    );
    const [loading, setLoading] = useState(true);

    const title = cennikData.title || `Cennik`;
    const categories = useMemo(
        () => cennikData.categories || {},
        [cennikData.categories]
    );

    // Pobierz wszystkie nadpisania tylko raz przy montowaniu
    useEffect(() => {
        const fetchOverrides = async () => {
            try {
                const response = await fetch(
                    `/api/overrides?manufacturer=${manufacturer}`
                );
                if (response.ok) {
                    const data = await response.json();
                    const overridesMap: Record<string, ProductOverride> = {};
                    data.overrides.forEach((override: ProductOverride) => {
                        const key = `${override.category}__${override.productName}`;
                        overridesMap[key] = override;
                    });
                    setOverrides(overridesMap);
                }
            } catch (error) {
                console.error("Error fetching overrides:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOverrides();
    }, [manufacturer]);

    // Filtrowanie produktów na podstawie wyszukiwania
    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories;

        const query = searchQuery.toLowerCase();
        const filtered: Record<string, Record<string, ProductData>> = {};

        Object.entries(categories).forEach(([categoryName, products]) => {
            // Sprawdź czy nazwa kategorii pasuje
            if (categoryName.toLowerCase().includes(query)) {
                filtered[categoryName] = products;
                return;
            }

            // Filtruj produkty w kategorii
            const matchedProducts: Record<string, ProductData> = {};
            Object.entries(products).forEach(([productName, productData]) => {
                if (
                    productName.toLowerCase().includes(query) ||
                    productData.material?.toLowerCase().includes(query) ||
                    productData.dimensions?.toLowerCase().includes(query)
                ) {
                    matchedProducts[productName] = productData;
                }
            });

            if (Object.keys(matchedProducts).length > 0) {
                filtered[categoryName] = matchedProducts;
            }
        });

        return filtered;
    }, [categories, searchQuery]);

    const filteredCategoryNames = Object.keys(filteredCategories);

    return (
        <div className="flex flex-col items-center justify-center anim-opacity space-y-6 pb-12 px-4">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">{title}</h1>

            {/* WYSZUKIWARKA */}
            <div className="w-full max-w-2xl mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Szukaj produktu, kategorii, materiału..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder-gray-400 text-gray-800 transition"
                    />
                </div>
            </div>

            {/* KATEGORIE I PRODUKTY */}
            {!loading &&
                filteredCategoryNames.map((category) => {
                    const products = filteredCategories[category];
                    const productEntries = Object.entries(products);

                    return (
                        <div
                            key={category}
                            id={category}
                            className="w-full max-w-7xl scroll-mt-8"
                        >
                            <p className="text-start w-full text-2xl font-semibold mb-6 capitalize">
                                {category}:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {productEntries.map(
                                    ([name, data], idx: number) => (
                                        <ProductCard
                                            key={name + idx}
                                            name={name}
                                            data={data}
                                            manufacturer={manufacturer.toLowerCase()}
                                            category={category}
                                            overrides={overrides}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}

            {/* BRAK WYNIKÓW */}
            {filteredCategoryNames.length === 0 && searchQuery && (
                <div className="text-center py-16 bg-white rounded-xl shadow-md w-full max-w-2xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">
                        Brak wyników dla:{" "}
                        <span className="font-semibold text-gray-700">
                            {searchQuery}
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}
