"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Image from "next/image";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices: Record<string, number>;
    options?: string[];
    previousName?: string;
};

type CennikData = {
    title?: string;
    categories: Record<string, Record<string, ProductData>>;
};

export default function ProductsTable({ products }: { products: CennikData }) {
    const [search, setSearch] = useState("");
    const categories = products.categories || {};

    const filteredCategories = useMemo(() => {
        if (!search) return categories;
        const lowerSearch = search.toLowerCase();
        const filtered: Record<string, Record<string, ProductData>> = {};
        Object.entries(categories).forEach(([category, items]) => {
            if (category.toLowerCase().includes(lowerSearch)) {
                filtered[category] = items;
            } else {
                const matchedItems: Record<string, ProductData> = {};
                Object.entries(items).forEach(([name, data]) => {
                    if (name.toLowerCase().includes(lowerSearch)) {
                        matchedItems[name] = data;
                    }
                });
                if (Object.keys(matchedItems).length > 0) {
                    filtered[category] = matchedItems;
                }
            }
        });
        return filtered;
    }, [categories, search]);

    const priceGroups = useMemo(() => {
        for (const category of Object.values(categories)) {
            for (const product of Object.values(category)) {
                return Object.keys(product.prices);
            }
        }
        return [];
    }, [categories]);

    return (
        <div className="space-y-8">
            <div className="max-w-xl mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Szukaj produktu lub kategorii..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder-gray-400 text-gray-800 transition"
                    />
                </div>
            </div>
            <div className="space-y-8">
                {Object.entries(filteredCategories).map(([category, items]) => (
                    <div
                        key={category}
                        id={category}
                        className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                    >
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                            <h2 className="text-2xl font-bold text-gray-800 capitalize">
                                {category}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Produkt
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Materiał
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Wymiary
                                        </th>
                                        {priceGroups.map((group) => (
                                            <th
                                                key={group}
                                                className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                            >
                                                {group}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {Object.entries(items).map(
                                        ([name, data], idx) => (
                                            <tr
                                                key={idx}
                                                className="hover:bg-blue-50 transition-colors"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {data.image ? (
                                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                                <Image
                                                                    src={
                                                                        data.image
                                                                    }
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="64px"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-300 flex-shrink-0"></div>
                                                        )}

                                                        <div>
                                                            <div className="font-semibold text-gray-900">
                                                                {name}
                                                            </div>
                                                            {data.previousName && (
                                                                <div className="text-xs text-gray-500">
                                                                    poprzednio:{" "}
                                                                    {
                                                                        data.previousName
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                                                    {data.material || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    {data.dimensions || "-"}
                                                </td>
                                                {priceGroups.map((group) => (
                                                    <td
                                                        key={group}
                                                        className="px-4 py-4 text-center font-semibold text-gray-900"
                                                    >
                                                        {data.prices[group]
                                                            ? `${data.prices[group]} zł`
                                                            : "-"}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {Object.values(items).some(
                            (item) => item.options && item.options.length > 0
                        ) && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                                    Informacje dodatkowe:
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    {Object.values(items)
                                        .flatMap((item) => item.options || [])
                                        .filter(
                                            (option, idx, arr) =>
                                                arr.indexOf(option) === idx
                                        )
                                        .map((option, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2"
                                            >
                                                <span className="text-blue-500 mt-1">
                                                    •
                                                </span>
                                                <span>{option}</span>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
                {Object.keys(filteredCategories).length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl shadow-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">
                            Brak wyników dla:{" "}
                            <span className="font-semibold text-gray-700">
                                {search}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
