"use client";

import { useState, useMemo } from "react";
import { Search, X, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

interface ProducerFactorData {
    slug: string;
    displayName: string;
    color?: string;
    mainFactor: number;
    categoryFactors: Record<string, number>;
    productsWithHigherFactor: {
        name: string;
        category?: string;
        priceFactor: number;
    }[];
}

interface FaktoryTableProps {
    data: ProducerFactorData[];
}

export function FaktoryTable({ data }: FaktoryTableProps) {
    const { isAdmin, isLoading } = useAuth();
    const [search, setSearch] = useState("");

    const filteredData = useMemo(() => {
        if (!search.trim()) return data;

        const query = search.toLowerCase();
        return data.filter((item) => {
            // Search in producer name
            if (item.displayName.toLowerCase().includes(query)) return true;

            // Search in category names
            if (
                Object.keys(item.categoryFactors).some((cat) =>
                    cat.toLowerCase().includes(query)
                )
            )
                return true;

            // Search in product names
            if (
                item.productsWithHigherFactor.some(
                    (p) =>
                        p.name.toLowerCase().includes(query) ||
                        p.category?.toLowerCase().includes(query)
                )
            )
                return true;

            return false;
        });
    }, [data, search]);

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto p-4 sm:p-6 my-8 lg:my-12">
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    // Access denied for non-admin users
    if (!isAdmin) {
        return (
            <div className="max-w-5xl mx-auto p-4 sm:p-6 my-8 lg:my-12 anim-opacity">
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        Brak dostępu
                    </h1>
                    <p className="text-gray-500">
                        Ta strona jest dostępna tylko dla administratorów.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 my-8 lg:my-12 anim-opacity">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    Faktory cenowe
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Ceny produktów mnożone są przez podane faktory
                </p>
            </header>

            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Szukaj producenta, kategorii lub produktu..."
                        className="w-full pl-10 pr-10 py-2.5 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {search && (
                    <p className="mt-2 text-sm text-gray-500">
                        Znaleziono: {filteredData.length}{" "}
                        {filteredData.length === 1
                            ? "producent"
                            : "producentów"}
                    </p>
                )}
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Producent / Element
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-28">
                                Faktor
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">
                                Różnica
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-4 py-8 text-center text-gray-500"
                                >
                                    Nie znaleziono wyników dla &quot;{search}
                                    &quot;
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((item) => (
                                <>
                                    {/* Producer row */}
                                    <tr
                                        key={item.slug}
                                        className="bg-white border-b border-gray-200"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            item.color ||
                                                            "#9ca3af",
                                                    }}
                                                />
                                                <span className="text-base font-semibold text-gray-900">
                                                    {item.displayName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-base font-bold text-gray-900">
                                                ×{item.mainFactor.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-400">
                                            —
                                        </td>
                                    </tr>

                                    {/* Category rows */}
                                    {Object.entries(item.categoryFactors).map(
                                        ([category, factor]) => {
                                            const diffPercent =
                                                ((factor - item.mainFactor) /
                                                    item.mainFactor) *
                                                100;
                                            return (
                                                <tr
                                                    key={`${item.slug}-cat-${category}`}
                                                    className="border-b border-gray-100 bg-amber-50/50 hover:bg-amber-50"
                                                >
                                                    <td className="px-4 py-2.5 pl-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-amber-400">
                                                                ↳
                                                            </span>
                                                            <span className="text-base text-gray-700 capitalize">
                                                                kategoria:{" "}
                                                                {category}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className="text-base font-semibold text-amber-700">
                                                            ×{factor.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span
                                                            className={`text-sm font-medium ${
                                                                diffPercent > 0
                                                                    ? "text-red-500"
                                                                    : "text-green-600"
                                                            }`}
                                                        >
                                                            {diffPercent > 0
                                                                ? "+"
                                                                : ""}
                                                            {diffPercent.toFixed(
                                                                0
                                                            )}
                                                            %
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}

                                    {/* Product rows */}
                                    {item.productsWithHigherFactor.map(
                                        (product, idx) => {
                                            const diffPercent =
                                                ((product.priceFactor -
                                                    item.mainFactor) /
                                                    item.mainFactor) *
                                                100;
                                            return (
                                                <tr
                                                    key={`${item.slug}-prod-${product.name}-${idx}`}
                                                    className="border-b border-gray-100 bg-red-50/50 hover:bg-red-50"
                                                >
                                                    <td className="px-4 py-2.5 pl-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-300">
                                                                ↳
                                                            </span>
                                                            <span className="text-base text-gray-700">
                                                                {product.name}
                                                            </span>
                                                            {product.category && (
                                                                <span className="text-sm text-gray-400">
                                                                    (
                                                                    {
                                                                        product.category
                                                                    }
                                                                    )
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className="text-base font-semibold text-red-600">
                                                            ×
                                                            {product.priceFactor.toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className="text-sm font-medium text-red-500">
                                                            +
                                                            {diffPercent.toFixed(
                                                                0
                                                            )}
                                                            %
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-1">Jak to działa?</p>
                <p>
                    Cena produktu = cena bazowa × faktor. Na przykład: produkt
                    za 1000 zł z faktorem ×2.50 kosztuje{" "}
                    <strong>2500 zł</strong>.
                </p>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                    <span>Producent (faktor główny)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
                    <span>Dla kategorii</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                    <span>Dla produktu</span>
                </div>
            </div>
        </div>
    );
}
